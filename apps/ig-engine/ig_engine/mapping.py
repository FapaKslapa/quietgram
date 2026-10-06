from datetime import datetime

from instagrapi.types import Collection, DirectMessage, DirectThread, Media, Resource, UserShort

from ig_engine.schemas import Media as MediaOut
from ig_engine.schemas import Message, Post, Thread, User

ALBUM_MEDIA_TYPE = 8
VIDEO_MEDIA_TYPE = 2
SAVED_ALL_TYPE = "ALL_MEDIA_AUTO_COLLECTION"
SAVED_ALL_NAME = "all posts"


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
        author_id=str(media.user.pk),
        author_username=media.user.username or "",
        caption=media.caption_text or None,
        taken_at_ms=to_millis(media.taken_at),
        product_type=media.product_type or "feed",
        media=to_media_items(media),
    )


def to_message(message: DirectMessage) -> Message:
    return Message(
        id=str(message.id),
        sender_id=None if message.user_id is None else str(message.user_id),
        text=message.text,
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
