import json
import stat
from pathlib import Path

from tests.conftest import Harness
from tests.fakes import SESSION_ID


def test_session_inactive_before_login(harness: Harness) -> None:
    assert harness.request("GET", "/v1/session").json() == {"active": False, "username": None}


def test_login_activates_session_and_stores_private_file(harness: Harness, tmp_path: Path) -> None:
    harness.login()
    assert harness.request("GET", "/v1/session").json() == {"active": True, "username": "me"}
    stored = tmp_path / "accounts" / "acc1.json"
    assert stat.S_IMODE(stored.stat().st_mode) == 0o600
    assert json.loads(stored.read_text())["settings"]["uuids"] == {"device": "stable"}


def test_session_survives_restart_and_keeps_device_identity(
    harness: Harness, tmp_path: Path
) -> None:
    harness.login()
    restarted = Harness(tmp_path)
    assert restarted.request("GET", "/v1/session").json() == {"active": True, "username": "me"}
    assert restarted.request("GET", "/v1/following").status_code == 200


def test_calls_without_session_return_session_expired(harness: Harness) -> None:
    response = harness.request("GET", "/v1/following")
    assert response.status_code == 401
    assert response.json() == {"code": "session_expired"}
    assert harness.calls == []


def test_invalid_sessionid_is_rejected_without_echoing_it(harness: Harness) -> None:
    response = harness.request("PUT", "/v1/session", {"sessionid": "short secret value"})
    assert response.status_code == 422
    assert "short secret value" not in response.text
    assert harness.calls == []


def test_account_id_is_validated(harness: Harness) -> None:
    assert harness.request("GET", "/v1/session", account="../evil").status_code == 422
    assert harness.request("GET", "/v1/session", account=None).status_code == 422


def test_accounts_are_isolated(harness: Harness) -> None:
    harness.login()
    other = harness.request("GET", "/v1/session", account="acc2").json()
    assert other["active"] is False


def test_reel_product_type_is_preserved(harness: Harness) -> None:
    harness.login()
    saved = harness.request("GET", "/v1/saved").json()
    assert saved["posts"][0]["product_type"] == "clips"
    default = harness.request("GET", "/v1/users/2/posts").json()
    assert [post["product_type"] for post in default["posts"]] == ["feed"]
    with_reels = harness.request("GET", "/v1/users/2/posts", query="?include_reels=true").json()
    assert [post["product_type"] for post in with_reels["posts"]] == ["clips", "feed"]


def test_timeline_returns_cursor(harness: Harness) -> None:
    harness.login()
    page = harness.request("GET", "/v1/timeline", query="?cursor=abc").json()
    assert page["next_cursor"] == "next"
    assert page["posts"][0]["product_type"] == "feed"


def test_following_and_followers(harness: Harness) -> None:
    harness.login()
    assert harness.request("GET", "/v1/following").json()["users"][0]["username"] == "bob"
    assert harness.request("GET", "/v1/followers").json() == {"users": []}


def test_amount_bounds(harness: Harness) -> None:
    harness.login()
    assert harness.request("GET", "/v1/following", query="?amount=0").status_code == 422


def test_session_id_constant_is_valid_for_the_schema() -> None:
    assert len(SESSION_ID) > 30
