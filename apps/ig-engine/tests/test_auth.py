import json
import time

from ig_engine.auth import ReplayGuard, sign, signed_target
from tests.conftest import SECRET, Harness


def test_health_needs_no_signature(harness: Harness) -> None:
    assert harness.http.get("/health").status_code == 200


def test_valid_signature_is_accepted(harness: Harness) -> None:
    assert harness.request("GET", "/v1/session").status_code == 200


def test_bad_signature_is_rejected(harness: Harness) -> None:
    response = harness.request("GET", "/v1/session", secret="another-secret-0123456789")
    assert response.status_code == 401
    assert response.json() == {"code": "unauthorized"}


def test_stale_timestamp_is_rejected(harness: Harness) -> None:
    assert harness.request("GET", "/v1/session", age_seconds=61).status_code == 401


def test_future_timestamp_is_rejected(harness: Harness) -> None:
    assert harness.request("GET", "/v1/session", age_seconds=-120).status_code == 401


def test_missing_headers_are_rejected(harness: Harness) -> None:
    response = harness.http.get("/v1/session", headers={"x-ig-account-id": "acc1"})
    assert response.status_code == 401


def test_non_numeric_timestamp_is_rejected(harness: Harness) -> None:
    headers = {
        "x-engine-timestamp": "yesterday",
        "x-engine-signature": "00",
        "x-ig-account-id": "acc1",
    }
    assert harness.http.get("/v1/session", headers=headers).status_code == 401


def test_non_ascii_signature_is_rejected_cleanly(harness: Harness) -> None:
    headers = {
        "x-engine-timestamp": str(int(time.time())),
        "x-engine-signature": b"caf\xe9",
        "x-ig-account-id": "acc1",
    }
    assert harness.http.get("/v1/session", headers=headers).status_code == 401


def test_replayed_write_is_rejected(interactive: Harness) -> None:
    timestamp = str(int(time.time()))
    headers = {
        "x-engine-timestamp": timestamp,
        "x-engine-signature": sign(SECRET, timestamp, "POST", "/v1/posts/1/like", b""),
        "x-ig-account-id": "acc1",
    }
    assert interactive.http.post("/v1/posts/1/like", headers=headers).status_code == 200
    assert interactive.http.post("/v1/posts/1/like", headers=headers).status_code == 401
    assert interactive.calls == ["like:1"]


def test_identical_reads_are_not_treated_as_replays(harness: Harness) -> None:
    timestamp = str(int(time.time()))
    headers = {
        "x-engine-timestamp": timestamp,
        "x-engine-signature": sign(SECRET, timestamp, "GET", "/v1/session", b""),
        "x-ig-account-id": "acc1",
    }
    assert harness.http.get("/v1/session", headers=headers).status_code == 200
    assert harness.http.get("/v1/session", headers=headers).status_code == 200


def test_replay_guard_forgets_signatures_after_the_window() -> None:
    guard = ReplayGuard(ttl_seconds=10)
    assert guard.accept("s", 0)
    assert not guard.accept("s", 5)
    assert guard.accept("s", 11)


def test_tampered_body_is_rejected(harness: Harness) -> None:
    timestamp = str(int(time.time()))
    signed = json.dumps({"text": "hello"}).encode()
    tampered = json.dumps({"text": "goodbye"}).encode()
    headers = {
        "x-engine-timestamp": timestamp,
        "x-engine-signature": sign(SECRET, timestamp, "POST", "/v1/threads/1/messages", signed),
        "x-ig-account-id": "acc1",
        "content-type": "application/json",
    }
    response = harness.http.post("/v1/threads/1/messages", content=tampered, headers=headers)
    assert response.status_code == 401
    assert harness.calls == []


def test_signature_binds_method_and_path(harness: Harness) -> None:
    timestamp = str(int(time.time()))
    headers = {
        "x-engine-timestamp": timestamp,
        "x-engine-signature": sign(SECRET, timestamp, "GET", "/v1/followers", b""),
        "x-ig-account-id": "acc1",
    }
    assert harness.http.get("/v1/following", headers=headers).status_code == 401


def test_query_string_is_covered_by_the_signature(harness: Harness) -> None:
    harness.login()
    timestamp = str(int(time.time()))
    headers = {
        "x-engine-timestamp": timestamp,
        "x-engine-signature": sign(SECRET, timestamp, "GET", "/v1/following?amount=5", b""),
        "x-ig-account-id": "acc1",
    }
    assert harness.http.get("/v1/following?amount=5", headers=headers).status_code == 200
    assert harness.http.get("/v1/following?amount=500", headers=headers).status_code == 401
    assert harness.http.get("/v1/following", headers=headers).status_code == 401


def test_query_order_does_not_matter(harness: Harness) -> None:
    harness.login()
    response = harness.request("GET", "/v1/timeline", query="?cursor=a&amount=1")
    assert response.status_code == 200
    timestamp = str(int(time.time()))
    target = "/v1/timeline?amount=1&cursor=a"
    headers = {
        "x-engine-timestamp": timestamp,
        "x-engine-signature": sign(SECRET, timestamp, "GET", target, b""),
        "x-ig-account-id": "acc1",
    }
    assert harness.http.get("/v1/timeline?cursor=a&amount=1", headers=headers).status_code == 200


PINNED_SECRET = "test-secret-0123456789"
PINNED_TIMESTAMP = "1700000000"


def test_pinned_vector_for_a_get_with_query() -> None:
    target = signed_target("/v1/timeline", [("cursor", "a/b c*~'!()"), ("amount", "1")])
    assert target == "/v1/timeline?amount=1&cursor=a%2Fb+c%2A~%27%21%28%29"
    assert (
        sign(PINNED_SECRET, PINNED_TIMESTAMP, "GET", target, b"")
        == "fad3f217ea857f6d6852414044c30cb504eb7f654782ad7732b1bc39c52ddb2c"
    )


def test_pinned_vector_for_a_post_with_body() -> None:
    assert (
        sign(PINNED_SECRET, PINNED_TIMESTAMP, "POST", "/v1/threads/42/messages", b'{"text":"ciao"}')
        == "04b56bf05c8c699fa1ddd5eff8d755f2f2a5f1795884056dca2643fa76a315a0"
    )
