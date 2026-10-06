from instagrapi import Client
from instagrapi.exceptions import ClientError
from instagrapi.extractors import extract_media_v1
from instagrapi.types import Media

from ig_engine.instagram import InstagramClient, SessionSettings
from ig_engine.mapping import (
    is_reel,
    select_saved_collection,
    to_comment,
    to_message,
    to_post,
    to_profile,
    to_story,
    to_thread,
    to_tray,
    to_user,
)
from ig_engine.schemas import (
    Comment,
    Message,
    Post,
    PostsPage,
    Profile,
    Story,
    Thread,
    TimelinePage,
    TrayEntry,
    User,
)

PROFILE_MODULE = "reel_feed_timeline"


def require_ok(succeeded: bool) -> None:
    if not succeeded:
        raise ClientError("action was not accepted")


class InstagrapiClient:
    def __init__(self) -> None:
        self._client = Client()

    def load_settings(self, settings: SessionSettings) -> None:
        self._client.set_settings(settings)

    def export_settings(self) -> SessionSettings:
        settings: SessionSettings = self._client.get_settings()
        return settings

    def login(self, sessionid: str) -> str:
        self._client.login_by_sessionid(sessionid)
        username: str = self._client.username
        return username

    def following(self, amount: int) -> list[User]:
        users = self._client.user_following_v1(self._client.user_id, amount)
        return [to_user(user) for user in users]

    def followers(self, amount: int) -> list[User]:
        users = self._client.user_followers_v1(self._client.user_id, amount)
        return [to_user(user) for user in users]

    def user_posts(
        self, user_id: str, amount: int, cursor: str | None, include_reels: bool
    ) -> PostsPage:
        medias, next_cursor = self._client.user_medias_paginated_v1(
            user_id, amount, end_cursor=cursor or ""
        )
        posts = [to_post(media) for media in medias]
        return PostsPage(
            posts=posts if include_reels else [post for post in posts if not is_reel(post)],
            next_cursor=next_cursor or None,
        )

    def stories_tray(self) -> list[TrayEntry]:
        return to_tray(self._client.get_reels_tray_feed("pull_to_refresh"))

    def user_stories(self, user_id: str) -> list[Story]:
        mapped = (to_story(story) for story in self._client.user_stories_v1(user_id))
        return [story for story in mapped if story is not None]

    def user_profile(self, user_id: str) -> Profile:
        user = self._client.user_info_v1(user_id, from_module=PROFILE_MODULE)
        return to_profile(user, self._client.user_friendship_v1(user_id))

    def comments(self, media_id: str, amount: int) -> list[Comment]:
        return [to_comment(item) for item in self._client.media_comments_v1(media_id, amount)]

    def like(self, media_id: str) -> None:
        require_ok(self._client.media_like(media_id))

    def unlike(self, media_id: str) -> None:
        require_ok(self._client.media_unlike(media_id))

    def save(self, media_id: str) -> None:
        require_ok(self._client.media_save(media_id))

    def unsave(self, media_id: str) -> None:
        require_ok(self._client.media_unsave(media_id))

    def add_comment(self, media_id: str, text: str) -> None:
        self._client.media_comment(media_id, text)

    def delete_comment(self, media_id: str, comment_id: str) -> None:
        require_ok(self._client.comment_bulk_delete(media_id, [int(comment_id)]))

    def timeline(self, cursor: str | None) -> TimelinePage:
        raw = self._client.get_timeline_feed(max_id=cursor)
        entries = [entry.get("media_or_ad") for entry in raw.get("feed_items", [])]
        posts = [to_post(Media(**extract_media_v1(entry))) for entry in entries if entry]
        return TimelinePage(posts=posts, next_cursor=raw.get("next_max_id") or None)

    def saved(self, amount: int) -> list[Post]:
        collection_id = select_saved_collection(self._client.collections())
        if collection_id is None:
            return []
        medias = self._client.collection_medias(collection_id, amount)
        return [to_post(media) for media in medias]

    def threads(self, amount: int) -> list[Thread]:
        return [to_thread(thread) for thread in self._client.direct_threads(amount)]

    def messages(self, thread_id: str, amount: int) -> list[Message]:
        messages = self._client.direct_messages(int(thread_id), amount)
        return [to_message(message) for message in messages]

    def send_message(self, thread_id: str, text: str) -> Message:
        return to_message(self._client.direct_answer(int(thread_id), text))


def create_instagrapi_client() -> InstagramClient:
    return InstagrapiClient()
