from db.access import gate
from db.access.queries import load_queries
from db.access.scopes import SpaceScope
from db.driver import translates_neo4j_errors
from db.graph.reads import _edge, _node, subgraph

_QUERIES = load_queries(__file__)
# Paths asked for per route wanted, as parallel relationships make several paths of one route.
_PATHS_PER_ROUTE = 5


@translates_neo4j_errors
async def relation_groups(scope: SpaceScope, node_id: str) -> list[dict]:
    rows = await gate.rows(scope, _QUERIES["relation_groups"], {"node_id": node_id})
    return [dict(r) for r in rows]


@translates_neo4j_errors
async def common_neighbours(
    scope: SpaceScope, ids: list[str], label: str | None, min_shared: int, limit: int
) -> dict:
    """Entities linked to at least `min_shared` of `ids`, e.g. the players of a club in a season,
    with the edges that link them and how many there are in all."""
    params = {"ids": ids, "label": label, "min_shared": min_shared, "limit": limit}
    rows = await gate.rows(scope, _QUERIES["common_neighbours"], params)
    edges = {e["edge_id"]: _edge(e) for r in rows for e in r["edges"]}
    return {
        "nodes": [{**_node(r), "shared": r["shared"]} for r in rows],
        "edges": list(edges.values()),
        "total": rows[0]["total"] if rows else 0,
    }


@translates_neo4j_errors
async def shortest_paths(
    scope: SpaceScope, source_id: str, target_id: str, k: int, max_length: int
) -> dict:
    """Up to `k` shortest routes between two entities, shortest first, with every entity on
    them. Paths differing only in a parallel relationship are one route showing all of them."""
    query = _QUERIES["shortest_paths"].with_numbers(k=k * _PATHS_PER_ROUTE, max_length=max_length)
    rows = await gate.rows(scope, query, {"source_id": source_id, "target_id": target_id})
    routes: dict[tuple[str, ...], dict[str, dict]] = {}
    for r in rows:
        edges = routes.setdefault(tuple(r["node_ids"]), {})
        edges.update({e["edge_id"]: _edge(e) for e in r["edges"]})
    picked = list(routes.items())[:k]
    ids = list(dict.fromkeys(i for route, _ in picked for i in route))
    nodes = (await subgraph(scope, ids))["nodes"] if ids else []
    return {
        "nodes": nodes,
        "paths": [{"node_ids": list(route), "edges": list(e.values())} for route, e in picked],
    }


@translates_neo4j_errors
async def entities_by_label(scope: SpaceScope, label: str, limit: int, offset: int) -> dict:
    """One type's entities, best connected first, a page at a time."""
    params = {"label": label, "limit": limit, "offset": offset}
    rows = await gate.rows(scope, _QUERIES["entities_by_label"], params)
    return {"nodes": [_node(r) for r in rows], "total": rows[0]["total"] if rows else 0}


@translates_neo4j_errors
async def sources_for(scope: SpaceScope, ids: list[str], limit: int) -> list[dict]:
    rows = await gate.rows(scope, _QUERIES["sources_for"], {"ids": ids, "limit": limit})
    return [{**dict(r), "created_at": r["created_at"].to_native()} for r in rows]
