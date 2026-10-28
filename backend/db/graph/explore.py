from db.driver import get_driver, translates_neo4j_errors
from db.graph.reads import _edge, _node, subgraph
from db.query_loader import load_queries

_QUERIES = load_queries(__file__)
# Paths asked for per route wanted, as parallel relationships make several paths of one route.
_PATHS_PER_ROUTE = 5


@translates_neo4j_errors
async def relation_groups(space_id: str, node_id: str) -> list[dict]:
    params = {"space_id": space_id, "node_id": node_id}
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["relation_groups"], params)
        return [dict(r) async for r in res]


@translates_neo4j_errors
async def common_neighbours(
    space_id: str, ids: list[str], label: str | None, min_shared: int, limit: int
) -> dict:
    """Entities linked to at least `min_shared` of `ids`, e.g. the players of a club in a season,
    with the edges that link them and how many there are in all."""
    params = {
        "space_id": space_id,
        "ids": ids,
        "label": label,
        "min_shared": min_shared,
        "limit": limit,
    }
    async with get_driver().session() as session:
        rows = [r async for r in await session.run(_QUERIES["common_neighbours"], params)]
    edges = {e["edge_id"]: _edge(e) for r in rows for e in r["edges"]}
    return {
        "nodes": [{**_node(r), "shared": r["shared"]} for r in rows],
        "edges": list(edges.values()),
        "total": rows[0]["total"] if rows else 0,
    }


@translates_neo4j_errors
async def shortest_paths(
    space_id: str, source_id: str, target_id: str, k: int, max_length: int
) -> dict:
    """Up to `k` shortest routes between two entities, shortest first, with every entity on
    them. Paths differing only in a parallel relationship are one route showing all of them."""
    query = (
        _QUERIES["shortest_paths"]
        .replace("{k}", str(int(k) * _PATHS_PER_ROUTE))
        .replace("{max_length}", str(int(max_length)))
    )
    params = {"space_id": space_id, "source_id": source_id, "target_id": target_id}
    async with get_driver().session() as session:
        rows = [r async for r in await session.run(query, params)]
    routes: dict[tuple[str, ...], dict[str, dict]] = {}
    for r in rows:
        edges = routes.setdefault(tuple(r["node_ids"]), {})
        edges.update({e["edge_id"]: _edge(e) for e in r["edges"]})
    picked = list(routes.items())[:k]
    ids = list(dict.fromkeys(i for route, _ in picked for i in route))
    nodes = (await subgraph(space_id, ids))["nodes"] if ids else []
    return {
        "nodes": nodes,
        "paths": [{"node_ids": list(route), "edges": list(e.values())} for route, e in picked],
    }


@translates_neo4j_errors
async def entities_by_label(space_id: str, label: str, limit: int, offset: int) -> dict:
    """One type's entities, best connected first, a page at a time."""
    params = {"space_id": space_id, "label": label, "limit": limit, "offset": offset}
    async with get_driver().session() as session:
        rows = [r async for r in await session.run(_QUERIES["entities_by_label"], params)]
    return {"nodes": [_node(r) for r in rows], "total": rows[0]["total"] if rows else 0}


@translates_neo4j_errors
async def sources_for(space_id: str, ids: list[str], limit: int) -> list[dict]:
    params = {"space_id": space_id, "ids": ids, "limit": limit}
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["sources_for"], params)
        return [{**dict(r), "created_at": r["created_at"].to_native()} async for r in res]
