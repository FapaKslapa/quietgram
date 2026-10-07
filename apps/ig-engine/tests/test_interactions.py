from pathlib import Path

import pytest
from instagrapi.exceptions import ClientError, LoginRequired, PleaseWaitFewMinutes

from ig_engine.errors import ApiError
from ig_engine.rate_limit import InteractionLimiter
from tests.conftest import Harness

WRITES: list[tuple[str, str, str]] = [
    ("POST", "/v1/posts/77/like", "like:77"),
    ("DELETE", "/v1/posts/77/like", "unlike:77"),
    ("POST", "/v1/posts/77/save", "save:77"),
    ("DELETE", "/v1/posts/77/save", "unsave:77"),
    ("DELETE", "/v1/posts/77/comments/9", "delete_comment:77:9"),
]


@pytest.mark.parametrize(("method", "path", "call"), WRITES)
def test_writes_work_when_enabled(interactive: Harness, method: str, path: str, call: str) -> None:
    response = interactive.request(method, path)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert interactive.calls == [call]


def test_comment_is_posted(interactive: Harness) -> None:
    response = interactive.request("POST", "/v1/posts/77_5/comments", {"text": "bello"})
    assert response.json() == {"ok": True}
    assert interactive.calls == ["add_comment:77_5:bello"]


@pytest.mark.parametrize(("method", "path", "call"), WRITES)
def test_writes_are_forbidden_when_disabled(
    harness: Harness, method: str, path: str, call: str
) -> None:
    harness.login()
    harness.calls.clear()
    response = harness.request(method, path)
    assert response.status_code == 403
    assert response.json() == {"code": "interactions_disabled"}
    assert harness.calls == []


def test_comment_is_forbidden_when_disabled(harness: Harness) -> None:
    harness.login()
    harness.calls.clear()
    response = harness.request("POST", "/v1/posts/77/comments", {"text": "ciao"})
    assert response.status_code == 403
    assert harness.calls == []


@pytest.mark.parametrize("text", ["", "   \n", "x" * 2201])
def test_invalid_comment_makes_no_call(interactive: Harness, text: str) -> None:
    response = interactive.request("POST", "/v1/posts/77/comments", {"text": text})
    assert response.status_code == 422
    assert interactive.calls == []


def test_comment_at_max_length_is_accepted(interactive: Harness) -> None:
    response = interactive.request("POST", "/v1/posts/77/comments", {"text": "x" * 2200})
    assert response.status_code == 200


@pytest.mark.parametrize("path", ["/v1/posts/abc/like", "/v1/posts/77/comments/x"])
def test_ids_are_validated(interactive: Harness, path: str) -> None:
    assert interactive.request("DELETE", path).status_code == 422
    assert interactive.calls == []


def test_hourly_cap_returns_429_with_retry_after(tmp_path: Path) -> None:
    harness = Harness(tmp_path, interactions_enabled=True, max_per_hour=2)
    harness.login()
    harness.calls.clear()
    assert harness.request("POST", "/v1/posts/1/like").status_code == 200
    assert harness.request("POST", "/v1/posts/2/like").status_code == 200
    blocked = harness.request("POST", "/v1/posts/3/like")
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "throttled"
    assert blocked.json()["retry_after_seconds"] >= 1
    assert harness.calls == ["like:1", "like:2"]


def test_failed_attempts_do_not_count_toward_the_cap(tmp_path: Path) -> None:
    harness = Harness(tmp_path, interactions_enabled=True, max_per_hour=2)
    harness.login()
    harness.behavior.failure = ClientError("boom")
    for media in ("1", "2", "3"):
        assert harness.request("POST", f"/v1/posts/{media}/like").status_code == 502
    harness.behavior.failure = None
    assert harness.request("POST", "/v1/posts/4/like").status_code == 200
    assert harness.request("POST", "/v1/posts/5/like").status_code == 200
    assert harness.request("POST", "/v1/posts/6/like").status_code == 429


def test_release_returns_only_the_given_attempt() -> None:
    now = [0.0]
    limiter = InteractionLimiter(2, clock=lambda: now[0])
    first = limiter.acquire("a")
    now[0] = 1
    limiter.acquire("a")
    limiter.release("a", first)
    limiter.release("a", first)
    limiter.acquire("a")
    with pytest.raises(ApiError):
        limiter.acquire("a")


def test_limiter_is_a_sliding_window_per_account() -> None:
    now = [0.0]
    limiter = InteractionLimiter(2, clock=lambda: now[0])
    limiter.acquire("a")
    now[0] = 10
    limiter.acquire("a")
    limiter.acquire("b")
    with pytest.raises(ApiError) as caught:
        limiter.acquire("a")
    assert caught.value.status_code == 429
    assert caught.value.retry_after_seconds == 3591
    now[0] = 3601
    limiter.acquire("a")
    with pytest.raises(ApiError):
        limiter.acquire("a")


@pytest.mark.parametrize(
    ("failure", "status"),
    [
        (PleaseWaitFewMinutes("w"), 429),
        (LoginRequired("l"), 401),
        (ClientError("boom"), 502),
    ],
)
def test_write_errors_map(interactive: Harness, failure: Exception, status: int) -> None:
    interactive.behavior.failure = failure
    assert interactive.request("POST", "/v1/posts/77/like").status_code == status
