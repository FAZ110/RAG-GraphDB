from neo4j import AsyncGraphDatabase
from neo4j.exceptions import Neo4jError

from core.config import EMBEDDING_DIM, NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER
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


def get_driver():
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


async def execute_graph(nodes: list[dict], edges: list[dict]) -> None:
    statements = build_statements(nodes, edges)
    try:
        async with get_driver().session() as session:
            async with await session.begin_transaction() as tx:
                for cypher, params in statements:
                    await tx.run(cypher, params)
                await tx.commit()
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error: {e.message}") from e


async def fetch_graph() -> dict:
    async with get_driver().session() as session:
        nodes_res = await session.run(
            "MATCH (n) RETURN elementId(n) AS id, "
            "[l IN labels(n) WHERE l <> 'Entity'][0] AS label, "
            "properties(n) AS props"
        )
        nodes = [
            {
                "id": r["id"],
                "label": r["label"],
                "properties": {k: v for k, v in dict(r["props"]).items() if k != "embedding"},
            }
            async for r in nodes_res
        ]

        edges_res = await session.run(
            "MATCH (n)-[r]->(m) RETURN elementId(n) AS source, elementId(m) AS target, "
            "type(r) AS type, properties(r) AS props"
        )
        edges = [
            {
                "source": r["source"],
                "target": r["target"],
                "type": r["type"],
                "properties": dict(r["props"]),
            }
            async for r in edges_res
        ]

    return {"nodes": nodes, "edges": edges}


async def fetch_seed_graph(limit: int) -> dict:
    """Return the `limit` highest-degree nodes plus the edges between them."""
    try:
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
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error: {e.message}") from e

    return {"nodes": nodes, "edges": edges, "total_nodes": total_nodes}


async def fetch_node_expansion(node_id: str, limit: int) -> dict:
    """Return a node plus up to `limit` of its neighbours and the connecting edges."""
    try:
        async with get_driver().session() as session:
            root_res = await session.run(ROOT_NODE_CYPHER, {"node_id": node_id})
            root_record = await root_res.single()
            if root_record is None:
                return {"root": None, "nodes": [], "edges": []}
            root = node_from_row(root_record)

            neighbours_res = await session.run(
                NEIGHBOURS_CYPHER, {"node_id": node_id, "limit": limit}
            )
            rows = [r async for r in neighbours_res]
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error: {e.message}") from e

    nodes, edges = split_neighbour_rows(rows)
    return {"root": root, "nodes": nodes, "edges": edges}


async def ensure_vector_index() -> None:
    cypher = (
        "CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS "
        "FOR (n:Entity) ON (n.embedding) "
        "OPTIONS {indexConfig: {`vector.dimensions`: $dim, "
        "`vector.similarity_function`: 'cosine'}}"
    )
    try:
        async with get_driver().session() as session:
            await session.run(cypher, {"dim": EMBEDDING_DIM})
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error creating vector index: {e.message}") from e


async def similar_nodes(vec: list[float], top_k: int) -> list[dict]:
    cypher = (
        "CALL db.index.vector.queryNodes('entity_embeddings', $top_k, $vec) "
        "YIELD node, score "
        "RETURN elementId(node) AS id, "
        "node.name AS name, "
        "[l IN labels(node) WHERE l <> 'Entity'][0] AS label, "
        "score"
    )
    try:
        async with get_driver().session() as session:
            res = await session.run(cypher, {"top_k": top_k, "vec": vec})
            return [
                {"id": r["id"], "name": r["name"], "label": r["label"], "score": r["score"]}
                async for r in res
            ]
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error: {e.message}") from e


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


async def reset_graph() -> None:
    try:
        async with get_driver().session() as session:
            await session.run("MATCH (n) DETACH DELETE n")
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error: {e.message}") from e
