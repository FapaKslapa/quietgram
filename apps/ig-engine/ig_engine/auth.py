import hashlib
import hmac
import time
from typing import Annotated
from urllib.parse import urlencode

from fastapi import Depends, Request

from ig_engine.config import Settings
from ig_engine.dependencies import get_settings
from ig_engine.errors import unauthorized

MAX_SKEW_SECONDS = 60
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class ReplayGuard:
    def __init__(self, ttl_seconds: float = 2 * MAX_SKEW_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._seen: dict[str, float] = {}

    def accept(self, signature: str, now: float) -> bool:
        self._seen = {key: expiry for key, expiry in self._seen.items() if expiry > now}
        if signature in self._seen:
            return False
        self._seen[signature] = now + self._ttl
        return True


def sign(secret: str, timestamp: str, method: str, path: str, body: bytes) -> str:
    digest = hashlib.sha256(body).hexdigest()
    message = f"{timestamp}.{method.upper()}.{path}.{digest}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


def signed_target(path: str, query_items: list[tuple[str, str]]) -> str:
    if not query_items:
        return path
    return f"{path}?{urlencode(sorted(query_items))}"


async def verify_request(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> None:
    timestamp = request.headers.get("x-engine-timestamp")
    signature = request.headers.get("x-engine-signature")
    if timestamp is None or signature is None:
        raise unauthorized()
    try:
        issued_at = int(timestamp)
    except ValueError:
        raise unauthorized() from None
    if abs(time.time() - issued_at) > MAX_SKEW_SECONDS:
        raise unauthorized()
    expected = sign(
        settings.engine_secret.get_secret_value(),
        timestamp,
        request.method,
        signed_target(request.url.path, request.query_params.multi_items()),
        await request.body(),
    )
    if not hmac.compare_digest(expected.encode(), signature.encode()):
        raise unauthorized()
    if request.method not in SAFE_METHODS:
        replay_guard: ReplayGuard = request.app.state.replay_guard
        if not replay_guard.accept(signature, time.time()):
            raise unauthorized()
