import threading

from ig_engine.instagram import SessionSettings
from ig_engine.schemas import Media, Message, Post, Thread, TimelinePage, User

SESSION_ID = "1234567890%3AabcdefghijklmnopqrstuvwxyzABCDEF%3A28"


def sample_post(product_type: str = "feed") -> Post:
    return Post(
        id="1",
        code="Cabc123",
        author_id="2",
        author_username="alice",
        caption=None,
        taken_at_ms=1_700_000_000_000,
        product_type=product_type,
        media=[Media(kind="image", url="https://cdn.example/a.jpg", width=10, height=20)],
    )


class Behavior:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.failure: Exception | None = None


class FakeInstagramClient:
    def __init__(self, behavior: Behavior) -> None:
        self.behavior = behavior
        self.settings: SessionSettings = {"uuids": {"device": "stable"}}
        self.guard = threading.Lock()

    def record(self, name: str) -> None:
        with self.guard:
            self.behavior.calls.append(name)
        if self.behavior.failure is not None:
            raise self.behavior.failure

    def load_settings(self, settings: SessionSettings) -> None:
        self.settings = settings

    def export_settings(self) -> SessionSettings:
        return {**self.settings, "authorization_data": {"sessionid": "secret"}}

    def login(self, sessionid: str) -> str:
        self.record("login")
        return "me"

    def following(self, amount: int) -> list[User]:
        self.record("following")
        return [
            User(
                id="5",
                username="bob",
                avatar_url=None,
                is_verified=False,
                is_business=False,
                follower_count=None,
                latest_reel_media=1_700_000_000,
            )
        ]

    def followers(self, amount: int) -> list[User]:
        self.record("followers")
        return []

    def user_posts(self, user_id: str, amount: int) -> list[Post]:
        self.record("user_posts")
        return [sample_post("clips")]

    def timeline(self, cursor: str | None) -> TimelinePage:
        self.record("timeline")
        return TimelinePage(posts=[sample_post()], next_cursor="next")

    def saved(self, amount: int) -> list[Post]:
        self.record("saved")
        return [sample_post("clips")]

    def threads(self, amount: int) -> list[Thread]:
        self.record("threads")
        return [Thread(id="9", title="t", last_activity_at_ms=1, unread=True, preview=None)]

    def messages(self, thread_id: str, amount: int) -> list[Message]:
        self.record("messages")
        return [Message(id="m", sender_id="5", text="hi", kind="text", sent_at_ms=2)]

    def send_message(self, thread_id: str, text: str) -> Message:
        self.record("send_message")
        return Message(id="m2", sender_id="1", text=text, kind="text", sent_at_ms=3)
