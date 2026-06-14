from fastapi import APIRouter

from db.database import fetch_graph, reset_graph, similar_nodes
from services.embedding_service import get_embedding_service

router = APIRouter()


@router.get("/graph")
async def get_graph():
    return await fetch_graph()


@router.delete("/graph")
async def delete_graph():
    await reset_graph()
    return {"message": "ok"}


@router.get("/graph/similar")
async def graph_similar(q: str, top_k: int = 10):
    embedder = get_embedding_service()
    vec = embedder.embed(q)
    return await similar_nodes(vec, top_k)
