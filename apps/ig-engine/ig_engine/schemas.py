from typing import Literal

from pydantic import BaseModel, Field, SecretStr, field_validator

from ig_engine.totp import decode_secret

MAX_MESSAGE_LENGTH = 1000
MAX_COMMENT_LENGTH = 2200
MIN_SESSIONID_LENGTH = 31


class SessionRequest(BaseModel):
    sessionid: str = Field(min_length=MIN_SESSIONID_LENGTH, max_length=512, pattern=r"^\d+\S*$")


class CredentialsLoginRequest(BaseModel):
    username: str = Field(pattern=r"^[A-Za-z0-9._]{1,30}$")
    password: SecretStr = Field(min_length=1, max_length=256)
    totp_secret: SecretStr | None = Field(default=None, max_length=128)

    @field_validator("totp_secret")
    @classmethod
    def check_totp_secret(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None:
            decode_secret(value.get_secret_value())
        return value


class LoginResult(BaseModel):
    sessionid: str
    csrftoken: str
    user_id: str
    username: str


class SessionStatus(BaseModel):
    active: bool
    username: str | None


class User(BaseModel):
    id: str
    username: str
    avatar_url: str | None
    is_verified: bool
    is_business: bool
    follower_count: int | None
    latest_reel_media: int | None


class Media(BaseModel):
    kind: Literal["image", "video"]
    url: str
    width: int
    height: int


class Post(BaseModel):
    id: str
    code: str | None
    author_id: str
    author_username: str
    caption: str | None
    taken_at_ms: int
    product_type: str
    media: list[Media]


class Thread(BaseModel):
    id: str
    title: str
    last_activity_at_ms: int
    unread: bool
    preview: str | None


type MessageKind = Literal["text", "photo", "video", "voice", "other"]


class Message(BaseModel):
    id: str
    sender_id: str | None
    text: str | None
    kind: MessageKind
    sent_at_ms: int


class TimelinePage(BaseModel):
    posts: list[Post]
    next_cursor: str | None


class UsersResponse(BaseModel):
    users: list[User]


class PostsResponse(BaseModel):
    posts: list[Post]


class PostsPage(BaseModel):
    posts: list[Post]
    next_cursor: str | None


class TrayEntry(BaseModel):
    user_id: str
    username: str
    avatar_url: str | None
    latest_reel_media: int | None
    seen: bool


class TrayResponse(BaseModel):
    tray: list[TrayEntry]


class Story(BaseModel):
    id: str
    taken_at_ms: int
    expires_at_ms: int
    media: Media
    product_type: str


class StoriesResponse(BaseModel):
    stories: list[Story]


class Friendship(BaseModel):
    following: bool
    followed_by: bool


class Profile(BaseModel):
    id: str
    username: str
    full_name: str
    biography: str
    avatar_url: str | None
    is_private: bool
    is_verified: bool
    is_business: bool
    follower_count: int
    following_count: int
    media_count: int
    external_url: str | None
    friendship: Friendship


class Comment(BaseModel):
    id: str
    user_id: str
    username: str
    avatar_url: str | None
    text: str
    created_at_ms: int
    like_count: int
    parent_id: str | None


class CommentsResponse(BaseModel):
    comments: list[Comment]


class Ok(BaseModel):
    ok: bool = True


class ThreadsResponse(BaseModel):
    threads: list[Thread]


class MessagesResponse(BaseModel):
    messages: list[Message]


class SendMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value


class AddCommentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_COMMENT_LENGTH)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value
