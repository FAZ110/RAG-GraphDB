from collections.abc import Mapping
from typing import Any

from core.config import (
    DEDUP_LEXICAL_MIN,
    DEDUP_SUGGEST_ANY_NAME_MIN,
    DEDUP_SUGGEST_LEXICAL_MIN,
    DEDUP_SUGGEST_MIN,
)
from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SpaceScope, UserScope
from db.driver import translates_neo4j_errors
from services.dedup import name_similarity, normalize_name

_QUERIES = load_queries(__file__)
_SEARCH_K_FACTOR = 20
_SEARCH_ALL_K = 500
_HIDDEN_PROPS = {"embedding", "space_id"}
# How many nearest entities are checked for a duplicate by name.
_DUPLICATE_POOL = 20


def _plain(value: Any) -> Any:
    # Neo4j's temporal types would serialise as their private fields.
    return value.to_native() if hasattr(value, "to_native") else value


def _node(row: Mapping[str, Any]) -> dict:
    props = {k: _plain(v) for k, v in dict(row["props"]).items() if k not in _HIDDEN_PROPS}
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
async def top_graph(scope: SpaceScope, limit: int) -> dict:
    """The space's best-connected entities, the edges among them and the entity total."""

    async def work(db: Runner) -> dict:
        nodes = [_node(r) for r in await db.rows(_QUERIES["top_nodes"], {"limit": limit})]
        edges = []
        if nodes:
            rows = await db.rows(_QUERIES["edges_between"], {"ids": [n["id"] for n in nodes]})
            edges = [_edge(r) for r in rows]
        total = (await db.single(_QUERIES["count_nodes"], strict=True))["total"]
        return {"nodes": nodes, "edges": edges, "total_nodes": total}

    return await gate.read(scope, work)


@translates_neo4j_errors
async def overview_graph(scope: SpaceScope, limit: int) -> dict:
    """Every entity of the space, best connected first and at most `limit`, slimmed to what a
    map of the whole graph draws, with the edges among them."""

    async def work(db: Runner) -> dict:
        nodes = [dict(r) for r in await db.rows(_QUERIES["overview_nodes"], {"limit": limit})]
        total = (await db.single(_QUERIES["count_nodes"], strict=True))["total"]
        ids = {n["id"] for n in nodes}
        edges = [
            _edge(r)
            for r in await db.rows(_QUERIES["space_edges"])
            if r["edge_source"] in ids and r["edge_target"] in ids
        ]
        return {
            "nodes": nodes,
            "edges": edges,
            "total_nodes": total,
            "truncated": total > len(nodes),
        }

    return await gate.read(scope, work)


@translates_neo4j_errors
async def fresh_nodes(scope: SpaceScope, limit: int) -> list[dict]:
    """The space's most recently extracted entities, newest first."""
    return [dict(r) for r in await gate.rows(scope, _QUERIES["fresh_nodes"], {"limit": limit})]


@translates_neo4j_errors
async def node_details(scope: SpaceScope, node_id: str) -> dict | None:
    row = await gate.single(scope, _QUERIES["node"], {"node_id": node_id})
    return _node(row) if row else None


@translates_neo4j_errors
async def edges_among(scope: SpaceScope, ids: list[str]) -> list[dict]:
    """Every edge of the space whose both ends are among `ids`."""
    return [_edge(r) for r in await gate.rows(scope, _QUERIES["edges_between"], {"ids": ids})]


@translates_neo4j_errors
async def subgraph(scope: SpaceScope, ids: list[str]) -> dict:
    """The given entities of the space, with fresh degrees, and the edges among them."""
    nodes = [_node(r) for r in await gate.rows(scope, _QUERIES["nodes_by_id"], {"ids": ids})]
    edges = await edges_among(scope, [n["id"] for n in nodes]) if nodes else []
    return {"nodes": nodes, "edges": edges}


@translates_neo4j_errors
async def node_neighbours(
    scope: SpaceScope,
    node_id: str,
    limit: int,
    type_: str | None = None,
    label: str | None = None,
    direction: str | None = None,
) -> dict | None:
    """A node of the space with up to `limit` neighbours, optionally of one group;
    None if it is not in the space."""
    params = {
        "node_id": node_id,
        "limit": limit,
        "type": type_,
        "label": label,
        "direction": direction,
    }

    async def work(db: Runner) -> dict | None:
        root = await db.single(_QUERIES["node"], params)
        if root is None:
            return None
        rows = await db.rows(_QUERIES["neighbours"], params)
        # A neighbour linked by several relationships comes back once per relationship.
        nodes = {r["id"]: _node(r) for r in rows}
        edges = {r["edge_id"]: _edge(r) for r in rows}
        return {"root": _node(root), "nodes": list(nodes.values()), "edges": list(edges.values())}

    return await gate.read(scope, work)


@translates_neo4j_errors
async def node_sources(scope: SpaceScope, node_id: str) -> list[dict]:
    return [
        _source(r) for r in await gate.rows(scope, _QUERIES["node_sources"], {"node_id": node_id})
    ]


@translates_neo4j_errors
async def edge_sources(scope: SpaceScope, edge_id: str) -> list[dict]:
    return [
        _source(r) for r in await gate.rows(scope, _QUERIES["edge_sources"], {"edge_id": edge_id})
    ]


@translates_neo4j_errors
async def search_nodes(scope: SpaceScope, vec: list[float], top_k: int) -> list[dict]:
    params = {"vec": vec, "top_k": top_k, "search_k": top_k * _SEARCH_K_FACTOR}
    return [
        {"id": r["id"], "name": r["name"], "label": r["label"], "score": r["score"]}
        for r in await gate.rows(scope, _QUERIES["search"], params)
    ]


@translates_neo4j_errors
async def search_all_spaces(scope: UserScope, vec: list[float], top_k: int) -> list[dict]:
    # shortcut: an owner whose entities rank below _SEARCH_ALL_K of others' gets fewer hits;
    # move to a filtered vector search (Neo4j 2025+ SEARCH ... WHERE) when that shows.
    params = {"vec": vec, "top_k": top_k, "search_k": _SEARCH_ALL_K}
    return [dict(r) for r in await gate.rows(scope, _QUERIES["search_all"], params)]


@translates_neo4j_errors
async def existing_like(
    scope: SpaceScope, vec: list[float], label: str, names: list[str], top_k: int
) -> list[dict]:
    """Entities a new one with this embedding, label and names would likely duplicate:
    one with the same name, or of the same label named alike as auto-dedup requires.
    The label stands in for dedup's type check, which keeps a club apart from its matches."""
    params = {
        "vec": vec,
        "search_top": _DUPLICATE_POOL,
        "search_k": _DUPLICATE_POOL * _SEARCH_K_FACTOR,
    }
    rows = await gate.rows(scope, _QUERIES["nearest_entities"], params)

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
async def duplicate_suggestions(scope: SpaceScope) -> list[dict]:
    """Pairs extraction found alike but not alike enough to merge on its own."""
    params = {
        "score_min": DEDUP_SUGGEST_MIN,
        "lexical_min": DEDUP_SUGGEST_LEXICAL_MIN,
        "any_name_min": DEDUP_SUGGEST_ANY_NAME_MIN,
    }
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
        for r in await gate.rows(scope, _QUERIES["duplicate_suggestions"], params)
    ]
