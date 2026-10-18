from collections.abc import Mapping
from typing import Any

from db.driver import get_driver, translates_neo4j_errors
from db.query_loader import load_queries

_QUERIES = load_queries(__file__)
_SEARCH_K_FACTOR = 20
_HIDDEN_PROPS = {"embedding", "space_id"}


def _node(row: Mapping[str, Any]) -> dict:
    props = {k: v for k, v in dict(row["props"]).items() if k not in _HIDDEN_PROPS}
    return {
        "id": row["id"],
        "label": row["label"],
        "name": props.get("name", ""),
        "degree": row["degree"],
        "properties": props,
    }


def _edge(row: Mapping[str, Any]) -> dict:
    return {
        "id": row["edge_id"],
        "source": row["edge_source"],
        "target": row["edge_target"],
        "type": row["edge_type"],
    }


@translates_neo4j_errors
async def top_graph(space_id: str, limit: int) -> dict:
    """The space's best-connected entities, the edges among them and the entity total."""
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["top_nodes"], {"space_id": space_id, "limit": limit})
        nodes = [_node(r) async for r in res]

        edges = []
        if nodes:
            res = await session.run(
                _QUERIES["edges_between"],
                {"space_id": space_id, "ids": [n["id"] for n in nodes]},
            )
            edges = [_edge(r) async for r in res]

        res = await session.run(_QUERIES["count_nodes"], {"space_id": space_id})
        total = (await res.single(strict=True))["total"]

    return {"nodes": nodes, "edges": edges, "total_nodes": total}


@translates_neo4j_errors
async def node_neighbours(space_id: str, node_id: str, limit: int) -> dict | None:
    """A node of the space with up to `limit` neighbours; None if it is not in the space."""
    params = {"space_id": space_id, "node_id": node_id, "limit": limit}
    async with get_driver().session() as session:
        root = await (await session.run(_QUERIES["node"], params)).single()
        if root is None:
            return None
        rows = [r async for r in await session.run(_QUERIES["neighbours"], params)]

    # A neighbour linked by several relationships comes back once per relationship.
    nodes = {r["id"]: _node(r) for r in rows}
    edges = {r["edge_id"]: _edge(r) for r in rows}
    return {"root": _node(root), "nodes": list(nodes.values()), "edges": list(edges.values())}


@translates_neo4j_errors
async def search_nodes(space_id: str, vec: list[float], top_k: int) -> list[dict]:
    params = {
        "space_id": space_id,
        "vec": vec,
        "top_k": top_k,
        "search_k": top_k * _SEARCH_K_FACTOR,
    }
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["search"], params)
        return [
            {"id": r["id"], "name": r["name"], "label": r["label"], "score": r["score"]}
            async for r in res
        ]
