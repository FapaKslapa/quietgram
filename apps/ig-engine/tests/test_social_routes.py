import pytest
from instagrapi.exceptions import LoginRequired, PleaseWaitFewMinutes

from tests.conftest import Harness


def test_tray_returns_accounts(harness: Harness) -> None:
    harness.login()
    body = harness.request("GET", "/v1/stories/tray").json()
    assert body == {
        "tray": [
            {
                "user_id": "5",
                "username": "bob",
                "avatar_url": None,
                "latest_reel_media": 10,
                "seen": False,
            }
        ]
    }


def test_user_stories_and_profile(harness: Harness) -> None:
    harness.login()
    stories = harness.request("GET", "/v1/users/5/stories").json()["stories"]
    assert stories[0]["media"]["kind"] == "image"
    profile = harness.request("GET", "/v1/users/5/profile").json()
    assert profile["id"] == "5"
    assert profile["friendship"] == {"following": True, "followed_by": False}


def test_comments_listing(harness: Harness) -> None:
    harness.login()
    body = harness.request("GET", "/v1/posts/77/comments", query="?amount=5").json()
    assert body["comments"][0]["parent_id"] is None


def test_read_routes_never_call_a_seen_or_write_method(harness: Harness) -> None:
    harness.login()
    harness.calls.clear()
    for path in ("/v1/stories/tray", "/v1/users/5/stories", "/v1/users/5/profile"):
        harness.request("GET", path)
    assert harness.calls == ["stories_tray", "user_stories", "user_profile"]


def test_user_posts_pagination_and_reel_filter(harness: Harness) -> None:
    harness.login()
    harness.calls.clear()
    body = harness.request("GET", "/v1/users/5/posts", query="?amount=24&cursor=abc").json()
    assert body["next_cursor"] == "more"
    assert [post["product_type"] for post in body["posts"]] == ["feed"]
    assert harness.calls == ["user_posts:24:abc:False"]


@pytest.mark.parametrize("query", ["?amount=25", "?amount=0"])
def test_user_posts_amount_is_capped(harness: Harness, query: str) -> None:
    harness.login()
    assert harness.request("GET", "/v1/users/5/posts", query=query).status_code == 422


@pytest.mark.parametrize(
    "path", ["/v1/users/x/stories", "/v1/users/x/profile", "/v1/posts/abc/comments"]
)
def test_ids_are_validated(harness: Harness, path: str) -> None:
    harness.login()
    assert harness.request("GET", path).status_code == 422


@pytest.mark.parametrize(
    ("failure", "status"), [(PleaseWaitFewMinutes("w"), 429), (LoginRequired("l"), 401)]
)
def test_read_errors_map(harness: Harness, failure: Exception, status: int) -> None:
    harness.login()
    harness.behavior.failure = failure
    assert harness.request("GET", "/v1/stories/tray").status_code == status
