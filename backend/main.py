from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from api.admin import router as admin_router
from api.analyses import all_router as all_analyses_router
from api.analyses import router as analyses_router
from api.articles import router as articles_router
from api.auth import router as auth_router
from api.batches import router as batches_router
from api.debug import router as debug_router
from api.dependencies import current_user, require_admin
from api.graph import router as graph_router
from api.home import router as home_router
from api.jobs import router as jobs_router
from api.search import router as search_router
from api.settings import router as settings_router
from api.spaces import router as spaces_router
from core.config import API_DOCS, CORS_ORIGINS, DEV_ACCOUNTS
from db.driver import close_driver
from db.errors import GraphDatabaseError
from db.schema import ensure_schema
from services.auth.bootstrap import ensure_dev_accounts

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_schema()
    await ensure_dev_accounts(DEV_ACCOUNTS, CORS_ORIGINS)
    yield
    await close_driver()


app = FastAPI(
    title="Graph-LLM-JS API",
    lifespan=lifespan,
    docs_url="/docs" if API_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if API_DOCS else None,
)


@app.middleware("http")
async def guard_requests(request: Request, call_next):
    # CSRF: data-changing requests must come from the app's own origin.
    origin = request.headers.get("origin")
    if request.method not in _SAFE_METHODS and origin is not None and origin not in CORS_ORIGINS:
        return JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
    response = await call_next(request)
    for name, value in _SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.exception_handler(GraphDatabaseError)
async def graph_database_error_handler(_: Request, exc: GraphDatabaseError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


signed_in = [Depends(current_user)]
app.include_router(auth_router)
app.include_router(spaces_router, dependencies=signed_in)
app.include_router(articles_router, dependencies=signed_in)
app.include_router(graph_router, dependencies=signed_in)
app.include_router(analyses_router, dependencies=signed_in)
app.include_router(all_analyses_router, dependencies=signed_in)
app.include_router(jobs_router, dependencies=signed_in)
app.include_router(batches_router, dependencies=signed_in)
app.include_router(home_router, dependencies=signed_in)
app.include_router(search_router, dependencies=signed_in)
app.include_router(settings_router, dependencies=signed_in)
app.include_router(admin_router)
app.include_router(debug_router, dependencies=[Depends(require_admin)])  # TEMP


@app.get("/")
def read_root():
    return {"status": "Server works!!!"}
