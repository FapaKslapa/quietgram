from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from instagrapi.exceptions import ClientError

from ig_engine.instagrapi_client import InstagrapiClient


class FakeLibrary:
    def __init__(self, collections: list[SimpleNamespace]) -> None:
        self.collection_list = collections
        self.requested: list[tuple[str, int]] = []
        self.answered: list[tuple[int, str]] = []

    def collections(self) -> list[SimpleNamespace]:
        return self.collection_list

    def direct_answer(self, thread_id: int, text: str) -> SimpleNamespace:
        self.answered.append((thread_id, text))
        return SimpleNamespace(
            id="m1",
            user_id="1",
            text=text,
            timestamp=datetime(2024, 1, 1, tzinfo=UTC),
            item_type="text",
            media=None,
        )

    def collection_medias(self, collection_id: str, amount: int) -> list[SimpleNamespace]:
        self.requested.append((collection_id, amount))
        return [
            SimpleNamespace(
                pk=1,
                code="Cabc123",
                user=SimpleNamespace(pk="2", username="alice"),
                caption_text="",
                taken_at=datetime(2024, 1, 1, tzinfo=UTC),
                product_type="clips",
                media_type=2,
                dimensions=None,
                video_url="https://cdn.example/r.mp4",
                thumbnail_url=None,
                resources=[],
            )
        ]


def client_with(library: FakeLibrary) -> InstagrapiClient:
    client = InstagrapiClient()
    client._client = library
    return client


def test_saved_uses_selected_collection_and_keeps_reels() -> None:
    library = FakeLibrary(
        [SimpleNamespace(id="9", name="All posts", type="ALL_MEDIA_AUTO_COLLECTION")]
    )
    posts = client_with(library).saved(7)
    assert library.requested == [("9", 7)]
    assert posts[0].product_type == "clips"


def test_saved_with_no_collections_is_empty_without_media_call() -> None:
    library = FakeLibrary([])
    assert client_with(library).saved(7) == []
    assert library.requested == []


def test_send_message_answers_the_existing_thread() -> None:
    library = FakeLibrary([])
    sent = client_with(library).send_message("340282366841710301", "ciao")
    assert library.answered == [(340282366841710301, "ciao")]
    assert (sent.text, sent.kind) == ("ciao", "text")


class SocialLibrary:
    def __init__(self, accepted: bool = True) -> None:
        self.accepted = accepted
        self.calls: list[tuple[object, ...]] = []

    def user_medias_paginated_v1(
        self, user_id: str, amount: int, end_cursor: str = ""
    ) -> tuple[list[SimpleNamespace], str]:
        self.calls.append(("posts", user_id, amount, end_cursor))
        reel = SimpleNamespace(
            pk=1,
            code="R",
            user=SimpleNamespace(pk="2", username="alice"),
            caption_text="",
            taken_at=datetime(2024, 1, 1, tzinfo=UTC),
            product_type="clips",
            media_type=2,
            dimensions=None,
            video_url="https://cdn.example/r.mp4",
            thumbnail_url=None,
            resources=[],
        )
        photo = SimpleNamespace(**{**vars(reel), "pk": 2, "product_type": "feed", "media_type": 1})
        photo.video_url = None
        photo.thumbnail_url = "https://cdn.example/p.jpg"
        return [reel, photo], ""

    def get_reels_tray_feed(self, reason: str) -> dict[str, object]:
        self.calls.append(("tray", reason))
        return {"tray": [{"user": {"pk": 1, "username": "a"}, "latest_reel_media": 5, "seen": 0}]}

    def user_stories_v1(self, user_id: str) -> list[SimpleNamespace]:
        self.calls.append(("stories", user_id))
        return [
            SimpleNamespace(
                pk="1",
                taken_at=datetime(2024, 1, 1, tzinfo=UTC),
                product_type="story",
                video_url=None,
                thumbnail_url="https://cdn.example/s.jpg",
            )
        ]

    def user_info_v1(self, user_id: str, from_module: str) -> SimpleNamespace:
        self.calls.append(("info", user_id, from_module))
        return SimpleNamespace(
            pk=user_id,
            username="u",
            full_name="U",
            biography="b",
            profile_pic_url_hd=None,
            profile_pic_url=None,
            is_private=False,
            is_verified=True,
            is_business=False,
            follower_count=1,
            following_count=2,
            media_count=3,
            external_url=None,
        )

    def user_friendship_v1(self, user_id: str) -> SimpleNamespace | None:
        self.calls.append(("friendship", user_id))
        return None

    def media_comments_v1(self, media_id: str, amount: int) -> list[SimpleNamespace]:
        self.calls.append(("comments", media_id, amount))
        return []

    def media_like(self, media_id: str) -> bool:
        self.calls.append(("like", media_id))
        return self.accepted

    def media_unlike(self, media_id: str) -> bool:
        self.calls.append(("unlike", media_id))
        return self.accepted

    def media_save(self, media_id: str) -> bool:
        self.calls.append(("save", media_id))
        return self.accepted

    def media_unsave(self, media_id: str) -> bool:
        self.calls.append(("unsave", media_id))
        return self.accepted

    def media_comment(self, media_id: str, text: str) -> SimpleNamespace:
        self.calls.append(("comment", media_id, text))
        return SimpleNamespace()

    def comment_bulk_delete(self, media_id: str, comment_pks: list[int]) -> bool:
        self.calls.append(("delete", media_id, comment_pks))
        return self.accepted


def social_client(library: SocialLibrary) -> InstagrapiClient:
    client = InstagrapiClient()
    client._client = library
    return client


def test_user_posts_pages_and_filters_reels() -> None:
    library = SocialLibrary()
    client = social_client(library)
    page = client.user_posts("2", 24, "cur", False)
    assert library.calls == [("posts", "2", 24, "cur")]
    assert [post.product_type for post in page.posts] == ["feed"]
    assert page.next_cursor is None
    assert len(client.user_posts("2", 24, None, True).posts) == 2
    assert library.calls[-1] == ("posts", "2", 24, "")


def test_read_adapters_use_read_only_library_calls() -> None:
    library = SocialLibrary()
    client = social_client(library)
    assert client.stories_tray()[0].user_id == "1"
    assert client.user_stories("3")[0].id == "1"
    profile = client.user_profile("3")
    assert profile.is_verified is True
    assert client.comments("9", 5) == []
    names = [call[0] for call in library.calls]
    assert names == ["tray", "stories", "info", "friendship", "comments"]
    assert library.calls[0] == ("tray", "pull_to_refresh")
    assert library.calls[2] == ("info", "3", "reel_feed_timeline")


def test_write_adapters_call_the_library() -> None:
    library = SocialLibrary()
    client = social_client(library)
    client.like("1")
    client.unlike("1")
    client.save("1")
    client.unsave("1")
    client.add_comment("1", "ciao")
    client.delete_comment("1", "55")
    assert library.calls == [
        ("like", "1"),
        ("unlike", "1"),
        ("save", "1"),
        ("unsave", "1"),
        ("comment", "1", "ciao"),
        ("delete", "1", [55]),
    ]


def test_rejected_write_raises_a_client_error() -> None:
    client = social_client(SocialLibrary(accepted=False))
    with pytest.raises(ClientError):
        client.like("1")
    with pytest.raises(ClientError):
        client.delete_comment("1", "5")
