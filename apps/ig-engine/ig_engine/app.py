from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ig_engine.auth import verify_request
from ig_engine.client_pool import ClientFactory, ClientPool
from ig_engine.config import Settings
from ig_engine.errors import ApiError, handle_api_error
from ig_engine.instagrapi_client import create_instagrapi_client
from ig_engine.rate_limit import InteractionLimiter
from ig_engine.routes import direct, graph, health, interactions, posts, session, social


async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    issues = [
        {"loc": ".".join(str(part) for part in issue["loc"]), "msg": issue["msg"]}
        for issue in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"code": "invalid_request", "issues": issues})


def create_app(
    settings: Settings | None = None, client_factory: ClientFactory = create_instagrapi_client
) -> FastAPI:
    resolved = settings or Settings()
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings = resolved
    app.state.limiter = InteractionLimiter(resolved.interactions_max_per_hour)
    app.state.pool = ClientPool(
        data_dir=resolved.data_dir,
        factory=client_factory,
        min_delay=resolved.min_delay_seconds,
        max_delay=resolved.max_delay_seconds,
    )

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        return await handle_api_error(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return await handle_validation_error(request, exc)

    protected = APIRouter(prefix="/v1", dependencies=[Depends(verify_request)])
    for module in (session, graph, posts, social, interactions, direct):
        protected.include_router(module.router)
    app.include_router(health.router)
    app.include_router(protected)
    return app
