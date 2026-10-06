from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from ig_engine.client_pool import ClientPool
from ig_engine.config import Settings
from ig_engine.dependencies import AccountId, get_pool, get_settings
from ig_engine.errors import ApiError
from ig_engine.schemas import (
    Message,
    MessagesResponse,
    SendMessageRequest,
    ThreadsResponse,
)

router = APIRouter(prefix="/threads")

Pool = Annotated[ClientPool, Depends(get_pool)]
Amount = Annotated[int, Query(ge=1, le=100)]
ThreadId = Annotated[str, Path(pattern=r"^\d{1,64}$")]


@router.get("")
async def threads(account_id: AccountId, pool: Pool, amount: Amount = 20) -> ThreadsResponse:
    items = await pool.run(account_id, lambda client: client.threads(amount))
    return ThreadsResponse(threads=items)


@router.get("/{thread_id}")
async def thread_messages(
    thread_id: ThreadId, account_id: AccountId, pool: Pool, amount: Amount = 20
) -> MessagesResponse:
    items = await pool.run(account_id, lambda client: client.messages(thread_id, amount))
    return MessagesResponse(messages=items)


@router.post("/{thread_id}/messages")
async def send_message(
    thread_id: ThreadId,
    body: SendMessageRequest,
    account_id: AccountId,
    pool: Pool,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Message:
    if not settings.dm_send_enabled:
        raise ApiError(403, "send_disabled")
    return await pool.run(account_id, lambda client: client.send_message(thread_id, body.text))
