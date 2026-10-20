from fastapi import APIRouter, Depends, HTTPException, Query

from api.dependencies import existing_space
from db.graph.reads import node_neighbours, node_sources, search_nodes, top_graph
from services.embedding_service import get_embedding_service

router = APIRouter(
    prefix="/spaces/{space_id}/graph",
    tags=["graph"],
    dependencies=[Depends(existing_space)],
)

_MAX_PAGE = 500


@router.get("")
async def get_graph(space_id: str, limit: int = Query(25, ge=1, le=_MAX_PAGE)):
    return await top_graph(space_id, limit)


@router.get("/nodes/{node_id}/neighbours")
async def get_neighbours(space_id: str, node_id: str, limit: int = Query(25, ge=1, le=_MAX_PAGE)):
    result = await node_neighbours(space_id, node_id, limit)
    if result is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return result


@router.get("/nodes/{node_id}/sources")
async def get_sources(space_id: str, node_id: str):
    return await node_sources(space_id, node_id)


@router.get("/search")
async def search(space_id: str, q: str, top_k: int = Query(10, ge=1, le=100)):
    vec = get_embedding_service().embed(q)
    return await search_nodes(space_id, vec, top_k)
