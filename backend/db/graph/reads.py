from collections.abc import Mapping
from typing import Any

from core.config import (
    DEDUP_LEXICAL_MIN,
    DEDUP_SUGGEST_ANY_NAME_MIN,
    DEDUP_SUGGEST_LEXICAL_MIN,
    DEDUP_SUGGEST_MIN,
)
from db.driver import get_driver, translates_neo4j_errors
from db.query_loader import load_queries
from services.dedup import name_similarity, normalize_name

_QUERIES = load_queries(__file__)
_SEARCH_K_FACTOR = 20
_HIDDEN_PROPS = {"embedding", "space_id"}
# How many nearest entities are checked for a duplicate by name.
_DUPLICATE_POOL = 20


def _node(row: Mapping[str, Any]) -> dict:
    props = {k: v for k, v in dict(row["props"]).items() if k not in _HIDDEN_PROPS}
    return {
        "id": row["id"],
        "label": row["label"],
        "name": props.get("name", ""),
        "degree": row["degree"],
        "properties": props,
    }


def _source(row: Mapping[str, Any]) -> dict:
    # Spans count UTF-16 units, as the frontend does; Cypher's substring counts code points.
    text = row["content"].encode("utf-16-le")
    quotes = [text[s * 2 : e * 2].decode("utf-16-le") for s, e in row["spans"]]
    return {"article_id": row["article_id"], "title": row["title"], "quotes": quotes}


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
async def node_sources(space_id: str, node_id: str) -> list[dict]:
    params = {"space_id": space_id, "node_id": node_id}
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["node_sources"], params)
        return [_source(r) async for r in res]


@translates_neo4j_errors
async def edge_sources(space_id: str, edge_id: str) -> list[dict]:
    params = {"space_id": space_id, "edge_id": edge_id}
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["edge_sources"], params)
        return [_source(r) async for r in res]


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


@translates_neo4j_errors
async def search_all_spaces(vec: list[float], top_k: int) -> list[dict]:
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["search_all"], {"vec": vec, "top_k": top_k})
        return [dict(r) async for r in res]


@translates_neo4j_errors
async def existing_like(
    space_id: str, vec: list[float], label: str, names: list[str], top_k: int
) -> list[dict]:
    """Entities a new one with this embedding, label and names would likely duplicate:
    one with the same name, or of the same label named alike as auto-dedup requires.
    The label stands in for dedup's type check, which keeps a club apart from its matches."""
    params = {
        "space_id": space_id,
        "vec": vec,
        "search_top": _DUPLICATE_POOL,
        "search_k": _DUPLICATE_POOL * _SEARCH_K_FACTOR,
    }
    async with get_driver().session() as session:
        rows = [r async for r in await session.run(_QUERIES["nearest_entities"], params)]

    own = {normalize_name(n) for n in names}
    hits = []
    for r in rows:
        theirs = [r["name"], *r["aliases"]]
        same_name = any(normalize_name(t) in own for t in theirs)
        alike = max(name_similarity(a, b) for a in names for b in theirs) >= DEDUP_LEXICAL_MIN
        if same_name or (alike and r["label"] == label):
            hits.append({k: r[k] for k in ("id", "name", "label", "score")})
    return hits[:top_k]


@translates_neo4j_errors
async def duplicate_suggestions(space_id: str) -> list[dict]:
    """Pairs extraction found alike but not alike enough to merge on its own."""
    async with get_driver().session() as session:
        params = {
            "space_id": space_id,
            "score_min": DEDUP_SUGGEST_MIN,
            "lexical_min": DEDUP_SUGGEST_LEXICAL_MIN,
            "any_name_min": DEDUP_SUGGEST_ANY_NAME_MIN,
        }
        res = await session.run(_QUERIES["duplicate_suggestions"], params)
        return [
            {
                "id": r["id"],
                "score": r["score"],
                "lexical": r["lexical"],
                "nodes": [
                    _node({k: r[f"{side}_{k}"] for k in ("id", "label", "props", "degree")})
                    for side in ("a", "b")
                ],
            }
            async for r in res
        ]
