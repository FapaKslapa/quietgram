import threading

from ig_engine.instagram import SessionSettings
from ig_engine.schemas import (
    Comment,
    Friendship,
    LoginResult,
    Media,
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
        self.credentials: list[tuple[str, str, str]] = []


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

    def login_with_credentials(
        self, username: str, password: str, verification_code: str
    ) -> LoginResult:
        self.behavior.credentials.append((username, password, verification_code))
        self.record("login_with_credentials")
        self.settings = {**self.settings, "authorization_data": {"sessionid": "fresh"}}
        return LoginResult(
            sessionid="1000%3Afresh%3A28", csrftoken="csrf", user_id="1000", username=username
        )

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

    def user_posts(
        self, user_id: str, amount: int, cursor: str | None, include_reels: bool
    ) -> PostsPage:
        self.record(f"user_posts:{amount}:{cursor}:{include_reels}")
        posts = [sample_post("clips"), sample_post()]
        return PostsPage(
            posts=posts if include_reels else [sample_post()],
            next_cursor="more",
        )

    def stories_tray(self) -> list[TrayEntry]:
        self.record("stories_tray")
        return [
            TrayEntry(
                user_id="5", username="bob", avatar_url=None, latest_reel_media=10, seen=False
            )
        ]

    def user_stories(self, user_id: str) -> list[Story]:
        self.record("user_stories")
        return [
            Story(
                id="s1",
                taken_at_ms=1,
                expires_at_ms=2,
                media=Media(kind="image", url="https://cdn.example/s.jpg", width=0, height=0),
                product_type="story",
            )
        ]

    def user_profile(self, user_id: str) -> Profile:
        self.record("user_profile")
        return Profile(
            id=user_id,
            username="bob",
            full_name="Bob",
            biography="",
            avatar_url=None,
            is_private=False,
            is_verified=False,
            is_business=False,
            follower_count=1,
            following_count=2,
            media_count=3,
            external_url=None,
            friendship=Friendship(following=True, followed_by=False),
        )

    def comments(self, media_id: str, amount: int) -> list[Comment]:
        self.record("comments")
        return [
            Comment(
                id="c1",
                user_id="5",
                username="bob",
                avatar_url=None,
                text="nice",
                created_at_ms=1,
                like_count=0,
                parent_id=None,
            )
        ]

    def like(self, media_id: str) -> None:
        self.record(f"like:{media_id}")

    def unlike(self, media_id: str) -> None:
        self.record(f"unlike:{media_id}")

    def save(self, media_id: str) -> None:
        self.record(f"save:{media_id}")

    def unsave(self, media_id: str) -> None:
        self.record(f"unsave:{media_id}")

    def add_comment(self, media_id: str, text: str) -> None:
        self.record(f"add_comment:{media_id}:{text}")

    def delete_comment(self, media_id: str, comment_id: str) -> None:
        self.record(f"delete_comment:{media_id}:{comment_id}")

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
