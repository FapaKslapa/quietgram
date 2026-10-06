from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ig_engine.client_pool import ClientPool
from ig_engine.dependencies import AccountId, get_pool
from ig_engine.schemas import UsersResponse

router = APIRouter()

Pool = Annotated[ClientPool, Depends(get_pool)]
Amount = Annotated[int, Query(ge=1, le=1000)]


@router.get("/following")
async def following(account_id: AccountId, pool: Pool, amount: Amount = 200) -> UsersResponse:
    users = await pool.run(account_id, lambda client: client.following(amount))
    return UsersResponse(users=users)


@router.get("/followers")
async def followers(account_id: AccountId, pool: Pool, amount: Amount = 200) -> UsersResponse:
    users = await pool.run(account_id, lambda client: client.followers(amount))
    return UsersResponse(users=users)
