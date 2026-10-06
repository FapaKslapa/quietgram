from typing import Annotated

from fastapi import APIRouter, Depends

from ig_engine.client_pool import ClientPool
from ig_engine.dependencies import AccountId, get_pool
from ig_engine.schemas import SessionRequest, SessionStatus

router = APIRouter(prefix="/session")

Pool = Annotated[ClientPool, Depends(get_pool)]


@router.put("")
async def put_session(account_id: AccountId, body: SessionRequest, pool: Pool) -> SessionStatus:
    return await pool.login(account_id, body.sessionid)


@router.get("")
async def get_session(account_id: AccountId, pool: Pool) -> SessionStatus:
    return pool.status(account_id)
