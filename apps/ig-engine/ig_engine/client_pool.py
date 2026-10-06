import asyncio
import json
import os
import random
from collections.abc import Awaitable, Callable
from pathlib import Path

from ig_engine.errors import map_exception, session_expired
from ig_engine.instagram import InstagramClient, SessionSettings
from ig_engine.schemas import SessionStatus

type Sleeper = Callable[[float], Awaitable[None]]
type Jitter = Callable[[float, float], float]
type ClientFactory = Callable[[], InstagramClient]

DIRECTORY_MODE = 0o700
FILE_MODE = 0o600


class StoredSession:
    def __init__(self, settings: SessionSettings, username: str | None) -> None:
        self.settings = settings
        self.username = username


class ClientPool:
    def __init__(
        self,
        data_dir: Path,
        factory: ClientFactory,
        min_delay: float,
        max_delay: float,
        sleeper: Sleeper = asyncio.sleep,
        jitter: Jitter = random.uniform,
    ) -> None:
        self._accounts_dir = data_dir / "accounts"
        self._factory = factory
        self._min_delay = min_delay
        self._max_delay = max_delay
        self._sleeper = sleeper
        self._jitter = jitter
        self._lock = asyncio.Lock()
        self._clients: dict[str, InstagramClient] = {}
        self._usernames: dict[str, str | None] = {}
        self._expired: set[str] = set()
        self._has_called = False

    def _path(self, account_id: str) -> Path:
        return self._accounts_dir / f"{account_id}.json"

    def _read(self, account_id: str) -> StoredSession | None:
        path = self._path(account_id)
        if not path.exists():
            return None
        payload = json.loads(path.read_text())
        return StoredSession(payload["settings"], payload.get("username"))

    def _write(self, account_id: str, session: StoredSession) -> None:
        self._accounts_dir.mkdir(parents=True, exist_ok=True, mode=DIRECTORY_MODE)
        path = self._path(account_id)
        temporary = path.with_suffix(".tmp")
        payload = json.dumps({"settings": session.settings, "username": session.username})
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, FILE_MODE)
        with os.fdopen(descriptor, "w") as handle:
            handle.write(payload)
        temporary.chmod(FILE_MODE)
        temporary.replace(path)

    def _client_for(self, account_id: str) -> InstagramClient | None:
        client = self._clients.get(account_id)
        if client is not None:
            return client
        stored = self._read(account_id)
        if stored is None:
            return None
        client = self._factory()
        client.load_settings(stored.settings)
        self._clients[account_id] = client
        self._usernames[account_id] = stored.username
        return client

    async def _pace(self) -> None:
        if self._has_called:
            await self._sleeper(self._jitter(self._min_delay, self._max_delay))
        self._has_called = True

    def status(self, account_id: str) -> SessionStatus:
        client = self._client_for(account_id)
        active = client is not None and account_id not in self._expired
        return SessionStatus(active=active, username=self._usernames.get(account_id))

    async def login(self, account_id: str, sessionid: str) -> SessionStatus:
        async with self._lock:
            await self._pace()
            client = self._factory()
            stored = self._read(account_id)
            if stored is not None:
                client.load_settings(stored.settings)
            try:
                username = await asyncio.to_thread(client.login, sessionid)
            except Exception as exc:
                mapped = map_exception(exc)
                if mapped is None:
                    raise
                raise mapped from None
            self._write(account_id, StoredSession(client.export_settings(), username))
            self._clients[account_id] = client
            self._usernames[account_id] = username
            self._expired.discard(account_id)
            return SessionStatus(active=True, username=username)

    async def run[T](self, account_id: str, operation: Callable[[InstagramClient], T]) -> T:
        async with self._lock:
            client = self._client_for(account_id)
            if client is None or account_id in self._expired:
                raise session_expired()
            await self._pace()
            try:
                return await asyncio.to_thread(operation, client)
            except Exception as exc:
                mapped = map_exception(exc)
                if mapped is None:
                    raise
                if mapped.code == "session_expired":
                    self._expired.add(account_id)
                raise mapped from None
