import functools
from collections.abc import Awaitable, Callable

from neo4j import AsyncGraphDatabase
from neo4j.exceptions import DriverError, Neo4jError, TransientError

from core.config import EMBEDDING_DIM, NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER
from db.errors import GraphDatabaseError
from db.graph_builder import build_statements
from db.graph_queries import (
    NEIGHBOURS_CYPHER,
    ROOT_NODE_CYPHER,
    SEED_EDGES_CYPHER,
    SEED_NODES_CYPHER,
    edge_from_row,
    node_from_row,
    split_neighbour_rows,
)

_driver = None


def translates_neo4j_errors[**P, R](fn: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
    """Turn driver and server failures into one GraphDatabaseError.

    DriverError covers the client side (ServiceUnavailable, SessionExpired) and
    is *not* a Neo4jError, so catching only the latter misses an unreachable
    database entirely. TransientError is retryable, so it reports 503 like the
    driver-side failures; anything else the server rejects is our bug, not a
    availability problem, and stays a 500.
    """

    @functools.wraps(fn)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return await fn(*args, **kwargs)
        except DriverError as e:
            raise GraphDatabaseError(f"Neo4j unavailable: {e}", 503) from e
        except TransientError as e:
            raise GraphDatabaseError(f"Neo4j temporarily unavailable: {e.message}", 503) from e
        except Neo4jError as e:
            raise GraphDatabaseError(f"Neo4j error: {e.message}", 500) from e

    return wrapper


def get_driver():
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


@translates_neo4j_errors
async def execute_graph(nodes: list[dict], edges: list[dict]) -> None:
    statements = build_statements(nodes, edges)
    async with get_driver().session() as session:
        async with await session.begin_transaction() as tx:
            for cypher, params in statements:
                await tx.run(cypher, params)
            await tx.commit()


@translates_neo4j_errors
async def fetch_seed_graph(limit: int) -> dict:
    """Return the `limit` highest-degree nodes plus the edges between them."""
    async with get_driver().session() as session:
        nodes_res = await session.run(SEED_NODES_CYPHER, {"limit": limit})
        nodes = [node_from_row(r) async for r in nodes_res]

        ids = [n["id"] for n in nodes]
        edges = []
        if ids:
            edges_res = await session.run(SEED_EDGES_CYPHER, {"ids": ids})
            edges = [edge_from_row(r) async for r in edges_res]

        total_res = await session.run("MATCH (n:Entity) RETURN count(n) AS total")
        total_record = await total_res.single()
        total_nodes = total_record["total"] if total_record else 0

    return {"nodes": nodes, "edges": edges, "total_nodes": total_nodes}


@translates_neo4j_errors
async def fetch_node_expansion(node_id: str, limit: int) -> dict:
    """Return a node plus up to `limit` of its neighbours and the connecting edges."""
    async with get_driver().session() as session:
        root_res = await session.run(ROOT_NODE_CYPHER, {"node_id": node_id})
        root_record = await root_res.single()
        if root_record is None:
            return {"root": None, "nodes": [], "edges": []}
        root = node_from_row(root_record)

        neighbours_res = await session.run(NEIGHBOURS_CYPHER, {"node_id": node_id, "limit": limit})
        rows = [r async for r in neighbours_res]

    nodes, edges = split_neighbour_rows(rows)
    return {"root": root, "nodes": nodes, "edges": edges}


@translates_neo4j_errors
async def ensure_vector_index() -> None:
    cypher = (
        "CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS "
        "FOR (n:Entity) ON (n.embedding) "
        "OPTIONS {indexConfig: {`vector.dimensions`: $dim, "
        "`vector.similarity_function`: 'cosine'}}"
    )
    async with get_driver().session() as session:
        await session.run(cypher, {"dim": EMBEDDING_DIM})


@translates_neo4j_errors
async def similar_nodes(vec: list[float], top_k: int) -> list[dict]:
    cypher = (
        "CALL db.index.vector.queryNodes('entity_embeddings', $top_k, $vec) "
        "YIELD node, score "
        "RETURN elementId(node) AS id, "
        "node.name AS name, "
        "[l IN labels(node) WHERE l <> 'Entity'][0] AS label, "
        "score"
    )
    async with get_driver().session() as session:
        res = await session.run(cypher, {"top_k": top_k, "vec": vec})
        return [
            {"id": r["id"], "name": r["name"], "label": r["label"], "score": r["score"]}
            async for r in res
        ]


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


@translates_neo4j_errors
async def reset_graph() -> None:
    async with get_driver().session() as session:
        await session.run("MATCH (n) DETACH DELETE n")
