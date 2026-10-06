from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from ig_engine.client_pool import ClientPool
from ig_engine.dependencies import AccountId, get_pool
from ig_engine.schemas import PostsResponse, TimelinePage

router = APIRouter()

Pool = Annotated[ClientPool, Depends(get_pool)]
Amount = Annotated[int, Query(ge=1, le=100)]
UserId = Annotated[str, Path(pattern=r"^\d{1,32}$")]


@router.get("/users/{user_id}/posts")
async def user_posts(
    user_id: UserId, account_id: AccountId, pool: Pool, amount: Amount = 12
) -> PostsResponse:
    posts = await pool.run(account_id, lambda client: client.user_posts(user_id, amount))
    return PostsResponse(posts=posts)


@router.get("/timeline")
async def timeline(
    account_id: AccountId, pool: Pool, cursor: Annotated[str | None, Query(max_length=512)] = None
) -> TimelinePage:
    return await pool.run(account_id, lambda client: client.timeline(cursor))


@router.get("/saved")
async def saved(account_id: AccountId, pool: Pool, amount: Amount = 50) -> PostsResponse:
    posts = await pool.run(account_id, lambda client: client.saved(amount))
    return PostsResponse(posts=posts)
