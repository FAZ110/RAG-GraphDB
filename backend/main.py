from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.analyses import all_router as all_analyses_router
from api.analyses import router as analyses_router
from api.articles import router as articles_router
from api.batches import router as batches_router
from api.debug import router as debug_router
from api.graph import router as graph_router
from api.jobs import router as jobs_router
from api.search import router as search_router
from api.spaces import router as spaces_router
from db.driver import close_driver, get_driver
from db.errors import GraphDatabaseError
from db.schema import ensure_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_driver()
    await ensure_schema()
    yield
    await close_driver()


app = FastAPI(title="Graph-LLM-JS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(GraphDatabaseError)
async def graph_database_error_handler(_: Request, exc: GraphDatabaseError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


app.include_router(spaces_router)
app.include_router(articles_router)
app.include_router(graph_router)
app.include_router(analyses_router)
app.include_router(all_analyses_router)
app.include_router(jobs_router)
app.include_router(batches_router)
app.include_router(search_router)
app.include_router(debug_router)  # TEMP


@app.get("/")
def read_root():
    return {"status": "Server works!!!"}
