from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.extract import router as extract_router
from api.graph import router as graph_router
from db.database import close_driver, get_driver


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_driver()
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

app.include_router(extract_router)
app.include_router(graph_router)


@app.get("/")
def read_root():
    return {"status": "Server works!!!"}
