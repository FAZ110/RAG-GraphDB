from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.extract import router as extract_router
from api.graph import router as graph_router
from db.database import close_driver, ensure_vector_index, get_driver
from db.errors import GraphDatabaseError
from db.postgres.session import async_engine, run_migrations


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(run_migrations)
    get_driver()
    await ensure_vector_index()
    yield
    await close_driver()
    await async_engine.dispose()


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


app.include_router(extract_router)
app.include_router(graph_router)


@app.get("/")
def read_root():
    return {"status": "Server works!!!"}
