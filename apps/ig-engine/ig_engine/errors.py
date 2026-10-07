from fastapi import Request
from fastapi.responses import JSONResponse
from instagrapi.exceptions import (
    AccountSuspended,
    BadCredentials,
    BadPassword,
    CaptchaChallengeRequired,
    ChallengeError,
    ClientError,
    ClientLoginRequired,
    ClientThrottledError,
    ClientUnauthorizedError,
    LoginRequired,
    PleaseWaitFewMinutes,
    RateLimitError,
    ReloginAttemptExceeded,
    TwoFactorRequired,
)
from pydantic import ValidationError

THROTTLE_RETRY_AFTER_SECONDS = 1800

THROTTLED_ERRORS = (PleaseWaitFewMinutes, RateLimitError, ClientThrottledError)
CHALLENGE_ERRORS = (
    ChallengeError,
    TwoFactorRequired,
    CaptchaChallengeRequired,
    AccountSuspended,
    ReloginAttemptExceeded,
)
CREDENTIAL_ERRORS = (BadPassword, BadCredentials)
SESSION_ERRORS = (LoginRequired, ClientLoginRequired, ClientUnauthorizedError, ChallengeError)


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str | None = None,
        retry_after_seconds: int | None = None,
    ) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retry_after_seconds = retry_after_seconds

    def body(self) -> dict[str, str | int]:
        body: dict[str, str | int] = {"code": self.code}
        if self.message is not None:
            body["message"] = self.message
        if self.retry_after_seconds is not None:
            body["retry_after_seconds"] = self.retry_after_seconds
        return body


def unauthorized() -> ApiError:
    return ApiError(401, "unauthorized")


def session_expired() -> ApiError:
    return ApiError(401, "session_expired")


def map_exception(exc: Exception) -> ApiError | None:
    if isinstance(exc, THROTTLED_ERRORS):
        return ApiError(429, "throttled", retry_after_seconds=THROTTLE_RETRY_AFTER_SECONDS)
    if isinstance(exc, SESSION_ERRORS):
        return session_expired()
    if isinstance(exc, ClientError):
        return ApiError(
            502, "upstream_error", message=f"instagram request failed: {type(exc).__name__}"
        )
    if isinstance(exc, ValidationError):
        return ApiError(502, "upstream_error", message="unexpected instagram response")
    return None


def map_login_exception(exc: Exception) -> ApiError | None:
    if isinstance(exc, CHALLENGE_ERRORS):
        return ApiError(403, "challenge_required")
    if isinstance(exc, CREDENTIAL_ERRORS):
        return ApiError(403, "bad_credentials")
    return map_exception(exc)


async def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.body())
