from typing import Annotated

from fastapi import Header, Request

from ig_engine.client_pool import ClientPool
from ig_engine.config import Settings

ACCOUNT_ID_PATTERN = r"^[A-Za-z0-9_-]{1,64}$"

AccountId = Annotated[str, Header(alias="x-ig-account-id", pattern=ACCOUNT_ID_PATTERN)]


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_pool(request: Request) -> ClientPool:
    pool: ClientPool = request.app.state.pool
    return pool
