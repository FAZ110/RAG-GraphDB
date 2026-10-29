from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from api.dependencies import existing_space
from db.errors import EntityKeyTakenError
from db.graph.edits import (
    create_entity,
    create_relationship,
    delete_entity,
    delete_relationship,
    merge_entities,
    reject_suggestion,
    update_entity,
    update_relationship,
)
from db.graph.explore import (
    common_neighbours,
    entities_by_label,
    relation_groups,
    shortest_paths,
    sources_for,
)
from db.graph.reads import (
    duplicate_suggestions,
    edge_sources,
    existing_like,
    node_neighbours,
    node_sources,
    search_nodes,
    subgraph,
    top_graph,
)
from schemas.graph import (
    CommonQuery,
    EntityCreate,
    EntityIds,
    EntityMerge,
    EntityUpdate,
    Identifier,
    PathQuery,
    RelationshipCreate,
    RelationshipUpdate,
)
from services.embedding_service import embedding_text, get_embedding_service

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
async def get_neighbours(
    space_id: str,
    node_id: str,
    limit: int = Query(25, ge=1, le=_MAX_PAGE),
    type: Identifier | None = None,
    label: Identifier | None = None,
    direction: Literal["in", "out"] | None = None,
):
    """Neighbours of a node, or only one group of them: a relationship type, entity type
    or direction, as `/relations` counts them."""
    result = await node_neighbours(space_id, node_id, limit, type, label, direction)
    if result is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return result


@router.get("/nodes/{node_id}/relations")
async def get_relations(space_id: str, node_id: str):
    """How many neighbours a node has per direction, relationship type and entity type."""
    return await relation_groups(space_id, node_id)


@router.get("/nodes")
async def get_nodes_by_label(
    space_id: str,
    label: Identifier,
    limit: int = Query(50, ge=1, le=_MAX_PAGE),
    offset: int = Query(0, ge=0),
):
    """Entities of one type, best connected first, with how many there are in all."""
    return await entities_by_label(space_id, label, limit, offset)


@router.post("/subgraph")
async def post_subgraph(space_id: str, body: EntityIds):
    """Entities already picked, e.g. on an analysis canvas, with the edges among them."""
    return await subgraph(space_id, body.ids)


@router.post("/common")
async def post_common(space_id: str, body: CommonQuery):
    """What the given entities have in common, e.g. a club and a season give its players."""
    min_shared = min(body.min_shared or len(body.ids), len(body.ids))
    return await common_neighbours(space_id, body.ids, body.label, min_shared, body.limit)


@router.post("/paths")
async def post_paths(space_id: str, body: PathQuery):
    """The shortest paths between two entities, through entities only."""
    if body.source_id == body.target_id:
        raise HTTPException(status_code=422, detail="Ścieżka musi łączyć dwa różne węzły")
    return await shortest_paths(space_id, body.source_id, body.target_id, body.k, body.max_length)


@router.post("/sources")
async def post_sources(space_id: str, body: EntityIds, limit: int = Query(50, ge=1, le=200)):
    """Articles mentioning the given entities, those mentioning most of them first."""
    return await sources_for(space_id, body.ids, limit)


@router.get("/nodes/{node_id}/sources")
async def get_sources(space_id: str, node_id: str):
    return await node_sources(space_id, node_id)


@router.get("/edges/{edge_id}/sources")
async def get_edge_sources(space_id: str, edge_id: str):
    return await edge_sources(space_id, edge_id)


@router.get("/search")
async def search(space_id: str, q: str, top_k: int = Query(10, ge=1, le=100)):
    vec = get_embedding_service().embed(q)
    return await search_nodes(space_id, vec, top_k)


def _key_taken() -> HTTPException:
    return HTTPException(
        status_code=409,
        detail="Węzeł o tej nazwie i kategorii już istnieje, scal je zamiast tego",
    )


def _not_found(what: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{what} not found")


@router.post("/nodes", status_code=status.HTTP_201_CREATED)
async def post_node(space_id: str, body: EntityCreate):
    try:
        return await create_entity(
            space_id, body.label, body.name, body.description, body.type, body.aliases
        )
    except EntityKeyTakenError as e:
        raise _key_taken() from e


@router.post("/nodes/similar")
async def post_similar(space_id: str, body: EntityCreate):
    """Existing entities the node about to be created would likely duplicate."""
    vec = get_embedding_service().embed(embedding_text(body.label, body.name, body.description))
    return await existing_like(space_id, vec, body.label, [body.name, *body.aliases], 3)


@router.get("/duplicates")
async def get_duplicates(space_id: str):
    return await duplicate_suggestions(space_id)


@router.post("/duplicates/{suggestion_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def post_reject_duplicate(space_id: str, suggestion_id: str):
    if not await reject_suggestion(space_id, suggestion_id):
        raise _not_found("Suggestion")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/nodes/merge")
async def post_merge(space_id: str, body: EntityMerge):
    """Fold `merge_id` into `keep_id`; returns the kept node with its neighbours."""
    try:
        merged = await merge_entities(space_id, body.keep_id, body.merge_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if not merged:
        raise _not_found("Node")
    return await node_neighbours(space_id, body.keep_id, _MAX_PAGE)


@router.patch("/nodes/{node_id}")
async def patch_node(space_id: str, node_id: str, body: EntityUpdate):
    # Name, label and aliases can't be cleared; description and type can.
    changes = {
        k: v
        for k, v in body.model_dump(exclude_unset=True).items()
        if v is not None or k in ("description", "type")
    }
    try:
        node = await update_entity(space_id, node_id, changes)
    except EntityKeyTakenError as e:
        raise _key_taken() from e
    if node is None:
        raise _not_found("Node")
    return node


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_node(space_id: str, node_id: str):
    if not await delete_entity(space_id, node_id):
        raise _not_found("Node")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/edges", status_code=status.HTTP_201_CREATED)
async def post_edge(space_id: str, body: RelationshipCreate):
    try:
        edge = await create_relationship(space_id, body.source_id, body.target_id, body.type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if edge is None:
        raise _not_found("Node")
    return edge


@router.patch("/edges/{edge_id}")
async def patch_edge(space_id: str, edge_id: str, body: RelationshipUpdate):
    edge = await update_relationship(space_id, edge_id, body.type)
    if edge is None:
        raise _not_found("Edge")
    return edge


@router.delete("/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_edge(space_id: str, edge_id: str):
    if not await delete_relationship(space_id, edge_id):
        raise _not_found("Edge")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
