import pytest
from instagrapi.exceptions import (
    ChallengeRequired,
    ClientConnectionError,
    ClientThrottledError,
    LoginRequired,
    PleaseWaitFewMinutes,
    RateLimitError,
)

from ig_engine.errors import map_exception
from tests.conftest import Harness


@pytest.mark.parametrize("exc", [PleaseWaitFewMinutes, RateLimitError, ClientThrottledError])
def test_throttle_errors_map_to_429(exc: type[Exception]) -> None:
    mapped = map_exception(exc("secret-cookie-body"))
    assert mapped is not None
    assert mapped.status_code == 429
    assert mapped.body() == {"code": "throttled", "retry_after_seconds": 1800}


@pytest.mark.parametrize("exc", [LoginRequired, ChallengeRequired])
def test_session_errors_map_to_401(exc: type[Exception]) -> None:
    mapped = map_exception(exc("secret-cookie-body"))
    assert mapped is not None
    assert mapped.status_code == 401
    assert mapped.body() == {"code": "session_expired"}


def test_other_client_errors_map_to_502_without_upstream_body() -> None:
    mapped = map_exception(ClientConnectionError("sessionid=abc raw body"))
    assert mapped is not None
    assert mapped.status_code == 502
    assert mapped.body()["code"] == "upstream_error"
    assert "sessionid" not in str(mapped.body())


def test_unrelated_exceptions_are_not_mapped() -> None:
    assert map_exception(RuntimeError("boom")) is None


def test_route_returns_throttled_body(harness: Harness) -> None:
    harness.login()
    harness.behavior.failure = PleaseWaitFewMinutes("wait")
    response = harness.request("GET", "/v1/following")
    assert response.status_code == 429
    assert response.json() == {"code": "throttled", "retry_after_seconds": 1800}


def test_expired_session_is_reported_inactive(harness: Harness) -> None:
    harness.login()
    harness.behavior.failure = LoginRequired("expired")
    first = harness.request("GET", "/v1/timeline")
    assert first.status_code == 401
    assert first.json() == {"code": "session_expired"}
    status = harness.request("GET", "/v1/session").json()
    assert status["active"] is False
