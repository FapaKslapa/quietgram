from typing import Annotated

from fastapi import APIRouter, Depends

from ig_engine.client_pool import ClientPool
from ig_engine.dependencies import AccountId, get_pool
from ig_engine.schemas import CredentialsLoginRequest, LoginResult, SessionRequest, SessionStatus

router = APIRouter(prefix="/session")

Pool = Annotated[ClientPool, Depends(get_pool)]


@router.put("")
async def put_session(account_id: AccountId, body: SessionRequest, pool: Pool) -> SessionStatus:
    return await pool.login(account_id, body.sessionid)


@router.get("")
async def get_session(account_id: AccountId, pool: Pool) -> SessionStatus:
    return pool.status(account_id)


@router.post("/login")
async def login_with_credentials(
    account_id: AccountId, body: CredentialsLoginRequest, pool: Pool
) -> LoginResult:
    totp_secret = body.totp_secret.get_secret_value() if body.totp_secret else None
    return await pool.login_credentials(
        account_id, body.username, body.password.get_secret_value(), totp_secret
    )
