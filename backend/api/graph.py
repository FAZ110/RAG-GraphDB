from fastapi import APIRouter, HTTPException, Query

from db.database import (
    fetch_graph,
    fetch_node_expansion,
    fetch_seed_graph,
    reset_graph,
    similar_nodes,
)
from services.embedding_service import get_embedding_service

router = APIRouter()

_MAX_PAGE = 500


@router.get("/graph")
async def get_graph():
    return await fetch_graph()


@router.delete("/graph")
async def delete_graph():
    await reset_graph()
    return {"message": "ok"}


@router.get("/graph/seed")
async def get_graph_seed(limit: int = Query(25, ge=1, le=_MAX_PAGE)):
    return await fetch_seed_graph(limit)


@router.get("/graph/expand/{node_id}")
async def expand_graph_node(node_id: str, limit: int = Query(25, ge=1, le=_MAX_PAGE)):
    result = await fetch_node_expansion(node_id, limit)
    if result["root"] is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return result


@router.get("/graph/similar")
async def graph_similar(q: str, top_k: int = Query(10, ge=1, le=100)):
    embedder = get_embedding_service()
    vec = embedder.embed(q)
    return await similar_nodes(vec, top_k)
