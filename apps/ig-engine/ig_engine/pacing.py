from contextvars import ContextVar
from typing import Annotated

from fastapi import Header

FAST_PACING = "fast"

requested_pacing: ContextVar[str | None] = ContextVar("requested_pacing", default=None)


async def bind_pacing(
    pacing: Annotated[str | None, Header(alias="x-ig-pacing", max_length=16)] = None,
) -> None:
    requested_pacing.set(pacing)
