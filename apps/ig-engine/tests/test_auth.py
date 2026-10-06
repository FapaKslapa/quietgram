import json
import time

from ig_engine.auth import sign
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
