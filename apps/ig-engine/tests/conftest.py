import json
import time
from collections.abc import Callable
from pathlib import Path
from urllib.parse import parse_qsl

import httpx
import pytest
from fastapi.testclient import TestClient

from ig_engine.app import create_app
from ig_engine.auth import sign, signed_target
from ig_engine.config import Settings
from tests.fakes import SESSION_ID, Behavior, FakeInstagramClient

SECRET = "test-secret-0123456789"


class Harness:
    def __init__(self, data_dir: Path, send_enabled: bool = False) -> None:
        self.behavior = Behavior()
        settings = Settings(
            engine_secret=SECRET,
            data_dir=data_dir,
            dm_send_enabled=send_enabled,
            min_delay_seconds=0,
            max_delay_seconds=0,
        )
        self.http = TestClient(create_app(settings, self.build_client))

    @property
    def calls(self) -> list[str]:
        return self.behavior.calls

    def build_client(self) -> FakeInstagramClient:
        return FakeInstagramClient(self.behavior)

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, object] | None = None,
        account: str | None = "acc1",
        age_seconds: int = 0,
        secret: str = SECRET,
        query: str = "",
    ) -> httpx.Response:
        payload = b"" if body is None else json.dumps(body).encode()
        timestamp = str(int(time.time()) - age_seconds)
        headers = {
            "x-engine-timestamp": timestamp,
            "x-engine-signature": sign(
                secret,
                timestamp,
                method,
                signed_target(path, parse_qsl(query.lstrip("?"))),
                payload,
            ),
            "content-type": "application/json",
        }
        if account is not None:
            headers["x-ig-account-id"] = account
        response: httpx.Response = self.http.request(
            method, path + query, content=payload, headers=headers
        )
        return response

    def login(self) -> None:
        response = self.request("PUT", "/v1/session", {"sessionid": SESSION_ID})
        assert response.status_code == 200


@pytest.fixture
def harness(tmp_path: Path) -> Harness:
    return Harness(tmp_path)


@pytest.fixture
def harness_factory(tmp_path: Path) -> Callable[[bool], Harness]:
    return lambda send_enabled: Harness(tmp_path, send_enabled)
