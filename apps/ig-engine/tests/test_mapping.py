from datetime import UTC, datetime
from types import SimpleNamespace

from ig_engine.mapping import (
    message_kind,
    select_saved_collection,
    to_message,
    to_post,
    to_thread,
    to_user,
)

MOMENT = datetime(2024, 1, 1, tzinfo=UTC)
MOMENT_MS = 1_704_067_200_000


def media(**overrides: object) -> SimpleNamespace:
    base: dict[str, object] = {
        "pk": 11,
        "code": "Cabc123",
        "user": SimpleNamespace(pk="7", username="alice"),
        "caption_text": "hello",
        "taken_at": MOMENT,
        "product_type": "feed",
        "media_type": 1,
        "dimensions": SimpleNamespace(width=640, height=800),
        "video_url": None,
        "thumbnail_url": "https://cdn.example/p.jpg",
        "resources": [],
    }
    return SimpleNamespace(**{**base, **overrides})


def test_image_post_mapping() -> None:
    post = to_post(media())
    assert post.model_dump() == {
        "id": "11",
        "code": "Cabc123",
        "author_id": "7",
        "author_username": "alice",
        "caption": "hello",
        "taken_at_ms": MOMENT_MS,
        "product_type": "feed",
        "media": [
            {"kind": "image", "url": "https://cdn.example/p.jpg", "width": 640, "height": 800}
        ],
    }


def test_reel_keeps_product_type_and_video_kind() -> None:
    reel = media(product_type="clips", media_type=2, video_url="https://cdn.example/r.mp4")
    post = to_post(reel)
    assert post.product_type == "clips"
    assert post.media[0].kind == "video"
    assert post.media[0].url == "https://cdn.example/r.mp4"


def test_missing_code_becomes_null() -> None:
    assert to_post(media(code="")).code is None


def test_empty_caption_becomes_null_and_missing_dimensions_become_zero() -> None:
    post = to_post(media(caption_text="", dimensions=None))
    assert post.caption is None
    assert (post.media[0].width, post.media[0].height) == (0, 0)


def test_album_maps_each_resource() -> None:
    resources = [
        SimpleNamespace(media_type=1, video_url=None, thumbnail_url="https://cdn.example/1.jpg"),
        SimpleNamespace(media_type=2, video_url="https://cdn.example/2.mp4", thumbnail_url=None),
    ]
    post = to_post(media(media_type=8, resources=resources))
    assert [item.kind for item in post.media] == ["image", "video"]


def test_user_mapping_defaults() -> None:
    user = SimpleNamespace(
        pk=5, username="bob", profile_pic_url="https://cdn.example/b.jpg", is_verified=None
    )
    mapped = to_user(user)
    assert mapped.model_dump() == {
        "id": "5",
        "username": "bob",
        "avatar_url": "https://cdn.example/b.jpg",
        "is_verified": False,
        "is_business": False,
        "follower_count": None,
    }


def test_thread_and_message_mapping() -> None:
    latest = SimpleNamespace(
        id="m1", user_id=None, text="yo", timestamp=MOMENT, is_sent_by_viewer=False
    )
    thread = SimpleNamespace(
        id="99", thread_title="Alice", last_activity_at=MOMENT, read_state=1, messages=[latest]
    )
    mapped = to_thread(thread)
    assert (mapped.id, mapped.title, mapped.unread, mapped.preview) == ("99", "Alice", True, "yo")
    assert mapped.last_activity_at_ms == MOMENT_MS
    message = to_message(latest)
    assert message.sender_id is None
    assert message.sent_at_ms == MOMENT_MS


def test_empty_thread_has_no_preview() -> None:
    thread = SimpleNamespace(
        id="1", thread_title="", last_activity_at=MOMENT, read_state=0, messages=[]
    )
    mapped = to_thread(thread)
    assert mapped.preview is None
    assert mapped.unread is False


def collection(identifier: str, name: str, kind: str | None = None) -> SimpleNamespace:
    return SimpleNamespace(id=identifier, name=name, type=kind)


def test_saved_collection_selected_by_type() -> None:
    collections = [
        collection("1", "All posts"),
        collection("2", "Other", "ALL_MEDIA_AUTO_COLLECTION"),
    ]
    assert select_saved_collection(collections) == "2"


def test_saved_collection_falls_back_to_case_insensitive_name() -> None:
    collections = [collection("3", "Trips", "MEDIA"), collection("4", "All posts", "MEDIA")]
    assert select_saved_collection(collections) == "4"


def test_saved_collection_missing_type_field() -> None:
    assert select_saved_collection([SimpleNamespace(id="5", name="ALL POSTS")]) == "5"


def test_empty_collections_select_nothing() -> None:
    assert select_saved_collection([]) is None
    assert select_saved_collection([collection("6", "Trips", "MEDIA")]) is None


def item(item_type: str, text: str | None = None, media_type: int | None = None) -> SimpleNamespace:
    carried = None if media_type is None else SimpleNamespace(media_type=media_type)
    return SimpleNamespace(item_type=item_type, text=text, media=carried)


def test_message_kinds() -> None:
    assert message_kind(item("text", "hi")) == "text"
    assert message_kind(item("link", "see https://x.example")) == "text"
    assert message_kind(item("voice_media")) == "voice"
    assert message_kind(item("media", media_type=1)) == "photo"
    assert message_kind(item("media", media_type=2)) == "video"
    assert message_kind(item("raw_media")) == "photo"
    assert message_kind(item("reel_share")) == "other"
    assert message_kind(item("placeholder")) == "other"
