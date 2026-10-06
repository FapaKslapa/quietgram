import hashlib
import hmac
import time
from typing import Annotated
from urllib.parse import urlencode

from fastapi import Depends, Request

from ig_engine.config import Settings
from ig_engine.dependencies import get_settings
from ig_engine.errors import unauthorized

MAX_SKEW_SECONDS = 60


def sign(secret: str, timestamp: str, method: str, path: str, body: bytes) -> str:
    digest = hashlib.sha256(body).hexdigest()
    message = f"{timestamp}.{method.upper()}.{path}.{digest}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


def signed_target(path: str, query_items: list[tuple[str, str]]) -> str:
    if not query_items:
        return path
    return f"{path}?{urlencode(sorted(query_items))}"


async def verify_request(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> None:
    timestamp = request.headers.get("x-engine-timestamp")
    signature = request.headers.get("x-engine-signature")
    if timestamp is None or signature is None:
        raise unauthorized()
    try:
        issued_at = int(timestamp)
    except ValueError:
        raise unauthorized() from None
    if abs(time.time() - issued_at) > MAX_SKEW_SECONDS:
        raise unauthorized()
    expected = sign(
        settings.engine_secret.get_secret_value(),
        timestamp,
        request.method,
        signed_target(request.url.path, request.query_params.multi_items()),
        await request.body(),
    )
    if not hmac.compare_digest(expected, signature):
        raise unauthorized()
