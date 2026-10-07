import json
import logging
import time
from pathlib import Path

import pytest
from instagrapi.exceptions import (
    BadPassword,
    ChallengeRequired,
    PleaseWaitFewMinutes,
    TwoFactorRequired,
)

from ig_engine.totp import totp_code
from tests.conftest import Harness

PASSWORD = "hunter2-very-secret"
TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
BODY: dict[str, object] = {"username": "me.account", "password": PASSWORD}


def files_text(root: Path) -> str:
    return "".join(path.read_text() for path in root.rglob("*") if path.is_file())


def test_login_returns_fresh_session_and_activates_account(harness: Harness) -> None:
    response = harness.request("POST", "/v1/session/login", BODY)
    assert response.status_code == 200
    assert response.json() == {
        "sessionid": "1000%3Afresh%3A28",
        "csrftoken": "csrf",
        "user_id": "1000",
        "username": "me.account",
    }
    assert harness.request("GET", "/v1/session").json() == {
        "active": True,
        "username": "me.account",
    }
    assert harness.request("GET", "/v1/following").status_code == 200


def test_login_without_totp_sends_no_verification_code(harness: Harness) -> None:
    harness.request("POST", "/v1/session/login", BODY)
    assert harness.behavior.credentials == [("me.account", PASSWORD, "")]


def test_login_generates_totp_code_from_secret(harness: Harness) -> None:
    before = time.time()
    harness.request("POST", "/v1/session/login", {**BODY, "totp_secret": TOTP_SECRET})
    [(_, _, code)] = harness.behavior.credentials
    assert code in {totp_code(TOTP_SECRET, before), totp_code(TOTP_SECRET, time.time())}


def test_password_and_totp_secret_are_never_persisted(
    harness: Harness, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.DEBUG):
        harness.request("POST", "/v1/session/login", {**BODY, "totp_secret": TOTP_SECRET})
    stored = files_text(tmp_path)
    assert PASSWORD not in stored
    assert TOTP_SECRET not in stored
    assert PASSWORD not in caplog.text
    assert TOTP_SECRET not in caplog.text


def test_session_is_stored_privately_and_survives_restart(harness: Harness, tmp_path: Path) -> None:
    harness.request("POST", "/v1/session/login", BODY)
    stored = json.loads((tmp_path / "accounts" / "acc1.json").read_text())
    assert stored["username"] == "me.account"
    restarted = Harness(tmp_path)
    assert restarted.request("GET", "/v1/session").json()["active"] is True


def test_login_recovers_an_expired_session(harness: Harness) -> None:
    harness.login()
    harness.behavior.failure = ChallengeRequired("expired")
    assert harness.request("GET", "/v1/following").status_code == 401
    assert harness.request("GET", "/v1/session").json()["active"] is False
    harness.behavior.failure = None
    assert harness.request("POST", "/v1/session/login", BODY).status_code == 200
    assert harness.request("GET", "/v1/session").json()["active"] is True


@pytest.mark.parametrize(
    ("failure", "status", "code"),
    [
        (ChallengeRequired("checkpoint"), 403, "challenge_required"),
        (TwoFactorRequired("2fa"), 403, "challenge_required"),
        (BadPassword("wrong"), 403, "bad_credentials"),
        (PleaseWaitFewMinutes("slow"), 429, "throttled"),
    ],
)
def test_login_failures_are_mapped_without_echoing_secrets(
    harness: Harness, failure: Exception, status: int, code: str
) -> None:
    harness.behavior.failure = failure
    response = harness.request("POST", "/v1/session/login", BODY)
    assert response.status_code == status
    assert response.json()["code"] == code
    assert PASSWORD not in response.text
    assert harness.request("GET", "/v1/session").json()["active"] is False


def test_failed_login_keeps_the_device_identity_stable(harness: Harness, tmp_path: Path) -> None:
    harness.behavior.failure = ChallengeRequired("checkpoint")
    harness.request("POST", "/v1/session/login", BODY)
    device = json.loads((tmp_path / "accounts" / "acc1.device.json").read_text())
    assert device == {"uuids": {"device": "stable"}}
    assert PASSWORD not in files_text(tmp_path)
    harness.behavior.failure = None
    retry = {**BODY, "totp_secret": TOTP_SECRET}
    assert harness.request("POST", "/v1/session/login", retry).status_code == 200


def test_login_rejects_invalid_bodies_without_echoing_them(harness: Harness) -> None:
    bodies: list[dict[str, object]] = [
        {"username": "bad name!", "password": PASSWORD},
        {"username": "me", "password": ""},
        {"username": "me", "password": PASSWORD, "totp_secret": "not base32 !"},
    ]
    for body in bodies:
        response = harness.request("POST", "/v1/session/login", body)
        assert response.status_code == 422
        assert PASSWORD not in response.text
        assert "not base32" not in response.text
    assert harness.calls == []


def test_login_rejects_bad_signatures_stale_timestamps_and_replays(harness: Harness) -> None:
    wrong = harness.request("POST", "/v1/session/login", BODY, secret="wrong-secret-0123456789")
    assert wrong.status_code == 401
    assert harness.request("POST", "/v1/session/login", BODY, age_seconds=500).status_code == 401
    assert harness.request("POST", "/v1/session/login", BODY).status_code == 200
    assert harness.request("POST", "/v1/session/login", BODY).status_code == 401
    assert len(harness.behavior.credentials) == 1


def test_accounts_log_in_independently(harness: Harness) -> None:
    harness.request("POST", "/v1/session/login", BODY, account="acc2")
    assert harness.request("GET", "/v1/session", account="acc1").json()["active"] is False
    assert harness.request("GET", "/v1/session", account="acc2").json()["active"] is True
