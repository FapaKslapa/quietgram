from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from ig_engine.client_pool import ClientPool
from ig_engine.dependencies import AccountId, get_pool
from ig_engine.schemas import CommentsResponse, Profile, StoriesResponse, TrayResponse

router = APIRouter()

Pool = Annotated[ClientPool, Depends(get_pool)]
UserId = Annotated[str, Path(pattern=r"^\d{1,32}$")]
MediaId = Annotated[str, Path(pattern=r"^\d{1,32}(_\d{1,32})?$")]
CommentsAmount = Annotated[int, Query(ge=1, le=100)]


@router.get("/stories/tray")
async def stories_tray(account_id: AccountId, pool: Pool) -> TrayResponse:
    tray = await pool.run(account_id, lambda client: client.stories_tray())
    return TrayResponse(tray=tray)


@router.get("/users/{user_id}/stories")
async def user_stories(user_id: UserId, account_id: AccountId, pool: Pool) -> StoriesResponse:
    stories = await pool.run(account_id, lambda client: client.user_stories(user_id))
    return StoriesResponse(stories=stories)


@router.get("/users/{user_id}/profile")
async def user_profile(user_id: UserId, account_id: AccountId, pool: Pool) -> Profile:
    return await pool.run(account_id, lambda client: client.user_profile(user_id))


@router.get("/posts/{media_id}/comments")
async def comments(
    media_id: MediaId, account_id: AccountId, pool: Pool, amount: CommentsAmount = 20
) -> CommentsResponse:
    items = await pool.run(account_id, lambda client: client.comments(media_id, amount))
    return CommentsResponse(comments=items)
