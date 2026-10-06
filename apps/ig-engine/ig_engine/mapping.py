from datetime import datetime

from instagrapi.types import (
    Collection,
    DirectMessage,
    DirectThread,
    Media,
    Relationship,
    Resource,
    UserShort,
)
from instagrapi.types import (
    Comment as CommentIn,
)
from instagrapi.types import (
    Story as StoryIn,
)
from instagrapi.types import (
    User as ProfileIn,
)

from ig_engine.schemas import (
    Comment,
    Friendship,
    Message,
    MessageKind,
    Post,
    Profile,
    Story,
    Thread,
    TrayEntry,
    User,
)
from ig_engine.schemas import Media as MediaOut

ALBUM_MEDIA_TYPE = 8
VIDEO_MEDIA_TYPE = 2
VOICE_ITEM_TYPE = "voice_media"
MEDIA_ITEM_TYPES = ("media", "raw_media")
SAVED_ALL_TYPE = "ALL_MEDIA_AUTO_COLLECTION"
SAVED_ALL_NAME = "all posts"
STORY_LIFETIME_MS = 24 * 60 * 60 * 1000
REEL_PRODUCT_TYPE = "clips"


def to_millis(moment: datetime) -> int:
    return int(moment.timestamp() * 1000)


def to_user(user: UserShort) -> User:
    avatar = user.profile_pic_url
    return User(
        id=str(user.pk),
        username=user.username or "",
        avatar_url=None if avatar is None else str(avatar),
        is_verified=bool(user.is_verified),
        is_business=bool(getattr(user, "is_business", False)),
        follower_count=getattr(user, "follower_count", None),
        latest_reel_media=getattr(user, "latest_reel_media", None),
    )


def resource_media(resource: Resource, width: int, height: int) -> list[MediaOut]:
    if resource.media_type == VIDEO_MEDIA_TYPE and resource.video_url is not None:
        return [MediaOut(kind="video", url=str(resource.video_url), width=width, height=height)]
    if resource.thumbnail_url is not None:
        return [MediaOut(kind="image", url=str(resource.thumbnail_url), width=width, height=height)]
    return []


def to_media_items(media: Media) -> list[MediaOut]:
    dimensions = media.dimensions
    width = (dimensions.width if dimensions else None) or 0
    height = (dimensions.height if dimensions else None) or 0
    if media.media_type == ALBUM_MEDIA_TYPE:
        return [
            item for resource in media.resources for item in resource_media(resource, width, height)
        ]
    if media.video_url is not None:
        return [MediaOut(kind="video", url=str(media.video_url), width=width, height=height)]
    if media.thumbnail_url is not None:
        return [MediaOut(kind="image", url=str(media.thumbnail_url), width=width, height=height)]
    return []


def to_post(media: Media) -> Post:
    return Post(
        id=str(media.pk),
        code=media.code or None,
        author_id=str(media.user.pk),
        author_username=media.user.username or "",
        caption=media.caption_text or None,
        taken_at_ms=to_millis(media.taken_at),
        product_type=media.product_type or "feed",
        media=to_media_items(media),
    )


def message_kind(message: DirectMessage) -> MessageKind:
    if message.text:
        return "text"
    if message.item_type == VOICE_ITEM_TYPE:
        return "voice"
    if message.item_type in MEDIA_ITEM_TYPES:
        carried = message.media
        media_type = None if carried is None else carried.media_type
        return "video" if media_type == VIDEO_MEDIA_TYPE else "photo"
    return "other"


def to_message(message: DirectMessage) -> Message:
    return Message(
        id=str(message.id),
        sender_id=None if message.user_id is None else str(message.user_id),
        text=message.text,
        kind=message_kind(message),
        sent_at_ms=to_millis(message.timestamp),
    )


def to_thread(thread: DirectThread) -> Thread:
    latest = thread.messages[0] if thread.messages else None
    return Thread(
        id=str(thread.id),
        title=thread.thread_title,
        last_activity_at_ms=to_millis(thread.last_activity_at),
        unread=bool(thread.read_state),
        preview=latest.text if latest else None,
    )


def select_saved_collection(collections: list[Collection]) -> str | None:
    by_type = next((c for c in collections if getattr(c, "type", None) == SAVED_ALL_TYPE), None)
    chosen = by_type or next(
        (c for c in collections if (c.name or "").casefold() == SAVED_ALL_NAME), None
    )
    return None if chosen is None else str(chosen.id)


def is_reel(post: Post) -> bool:
    return post.product_type == REEL_PRODUCT_TYPE


def as_mapping(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        return {}
    return {str(key): item for key, item in value.items()}


def as_int(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int | float | str):
        return None
    try:
        return int(value)
    except ValueError:
        return None


def to_tray_entry(entry: object) -> TrayEntry | None:
    data = as_mapping(entry)
    user = as_mapping(data.get("user"))
    user_id = user.get("pk") or user.get("id")
    if user_id is None:
        return None
    latest = as_int(data.get("latest_reel_media"))
    seen_at = as_int(data.get("seen")) or 0
    avatar = user.get("profile_pic_url")
    return TrayEntry(
        user_id=str(user_id),
        username=str(user.get("username") or ""),
        avatar_url=avatar if isinstance(avatar, str) else None,
        latest_reel_media=latest,
        seen=seen_at > 0 and (latest is None or seen_at >= latest),
    )


def to_tray(raw: object) -> list[TrayEntry]:
    entries = as_mapping(raw).get("tray")
    if not isinstance(entries, list):
        return []
    mapped = (to_tray_entry(entry) for entry in entries)
    return [entry for entry in mapped if entry is not None]


def to_story(story: StoryIn) -> Story | None:
    if story.video_url is not None:
        media = MediaOut(kind="video", url=str(story.video_url), width=0, height=0)
    elif story.thumbnail_url is not None:
        media = MediaOut(kind="image", url=str(story.thumbnail_url), width=0, height=0)
    else:
        return None
    taken = to_millis(story.taken_at)
    return Story(
        id=str(story.pk),
        taken_at_ms=taken,
        expires_at_ms=taken + STORY_LIFETIME_MS,
        media=media,
        product_type=story.product_type or "story",
    )


def to_profile(user: ProfileIn, relationship: Relationship | None) -> Profile:
    avatar = user.profile_pic_url_hd or user.profile_pic_url
    return Profile(
        id=str(user.pk),
        username=user.username,
        full_name=user.full_name or "",
        biography=user.biography or "",
        avatar_url=None if avatar is None else str(avatar),
        is_private=bool(user.is_private),
        is_verified=bool(user.is_verified),
        is_business=bool(user.is_business),
        follower_count=user.follower_count,
        following_count=user.following_count,
        media_count=user.media_count,
        external_url=user.external_url or None,
        friendship=Friendship(
            following=bool(relationship and relationship.following),
            followed_by=bool(relationship and relationship.followed_by),
        ),
    )


def to_comment(comment: CommentIn) -> Comment:
    avatar = comment.user.profile_pic_url
    return Comment(
        id=str(comment.pk),
        user_id=str(comment.user.pk),
        username=comment.user.username or "",
        avatar_url=None if avatar is None else str(avatar),
        text=comment.text,
        created_at_ms=to_millis(comment.created_at_utc),
        like_count=comment.like_count or 0,
        parent_id=comment.replied_to_comment_id or None,
    )
