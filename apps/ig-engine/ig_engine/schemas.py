from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_MESSAGE_LENGTH = 1000
MIN_SESSIONID_LENGTH = 31


class SessionRequest(BaseModel):
    sessionid: str = Field(min_length=MIN_SESSIONID_LENGTH, max_length=512, pattern=r"^\d+\S*$")


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
