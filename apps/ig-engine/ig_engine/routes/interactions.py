from typing import Annotated

from fastapi import APIRouter, Depends, Path

from ig_engine.client_pool import ClientPool
from ig_engine.config import Settings
from ig_engine.dependencies import AccountId, get_limiter, get_pool, get_settings
from ig_engine.errors import ApiError
from ig_engine.rate_limit import InteractionLimiter
from ig_engine.schemas import AddCommentRequest, Ok

router = APIRouter(prefix="/posts/{media_id}")

Pool = Annotated[ClientPool, Depends(get_pool)]
Limiter = Annotated[InteractionLimiter, Depends(get_limiter)]
Config = Annotated[Settings, Depends(get_settings)]
MediaId = Annotated[str, Path(pattern=r"^\d{1,32}(_\d{1,32})?$")]
CommentId = Annotated[str, Path(pattern=r"^\d{1,32}$")]


def guard(settings: Settings, limiter: InteractionLimiter, account_id: str) -> None:
    if not settings.interactions_enabled:
        raise ApiError(403, "interactions_disabled")
    limiter.acquire(account_id)


@router.post("/like")
async def like(
    media_id: MediaId, account_id: AccountId, pool: Pool, limiter: Limiter, settings: Config
) -> Ok:
    guard(settings, limiter, account_id)
    await pool.run(account_id, lambda client: client.like(media_id))
    return Ok()


@router.delete("/like")
async def unlike(
    media_id: MediaId, account_id: AccountId, pool: Pool, limiter: Limiter, settings: Config
) -> Ok:
    guard(settings, limiter, account_id)
    await pool.run(account_id, lambda client: client.unlike(media_id))
    return Ok()


@router.post("/save")
async def save(
    media_id: MediaId, account_id: AccountId, pool: Pool, limiter: Limiter, settings: Config
) -> Ok:
    guard(settings, limiter, account_id)
    await pool.run(account_id, lambda client: client.save(media_id))
    return Ok()


@router.delete("/save")
async def unsave(
    media_id: MediaId, account_id: AccountId, pool: Pool, limiter: Limiter, settings: Config
) -> Ok:
    guard(settings, limiter, account_id)
    await pool.run(account_id, lambda client: client.unsave(media_id))
    return Ok()


@router.post("/comments")
async def add_comment(
    media_id: MediaId,
    body: AddCommentRequest,
    account_id: AccountId,
    pool: Pool,
    limiter: Limiter,
    settings: Config,
) -> Ok:
    guard(settings, limiter, account_id)
    await pool.run(account_id, lambda client: client.add_comment(media_id, body.text))
    return Ok()


@router.delete("/comments/{comment_id}")
async def delete_comment(
    media_id: MediaId,
    comment_id: CommentId,
    account_id: AccountId,
    pool: Pool,
    limiter: Limiter,
    settings: Config,
) -> Ok:
    guard(settings, limiter, account_id)
    await pool.run(account_id, lambda client: client.delete_comment(media_id, comment_id))
    return Ok()
