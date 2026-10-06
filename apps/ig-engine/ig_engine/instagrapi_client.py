from instagrapi import Client
from instagrapi.extractors import extract_media_v1
from instagrapi.types import Media

from ig_engine.instagram import InstagramClient, SessionSettings
from ig_engine.mapping import select_saved_collection, to_message, to_post, to_thread, to_user
from ig_engine.schemas import Message, Post, Thread, TimelinePage, User


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

    def user_posts(self, user_id: str, amount: int) -> list[Post]:
        return [to_post(media) for media in self._client.user_medias_v1(user_id, amount)]

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
