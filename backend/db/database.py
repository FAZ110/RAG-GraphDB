from neo4j import AsyncGraphDatabase
from neo4j.exceptions import Neo4jError

from core.config import EMBEDDING_DIM, NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER
from db.graph_builder import build_statements

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
        "RETURN node.name AS name, "
        "[l IN labels(node) WHERE l <> 'Entity'][0] AS label, "
        "score"
    )
    try:
        async with get_driver().session() as session:
            res = await session.run(cypher, {"top_k": top_k, "vec": vec})
            return [
                {"name": r["name"], "label": r["label"], "score": r["score"]}
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
