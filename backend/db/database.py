from neo4j import AsyncGraphDatabase
from neo4j.exceptions import Neo4jError

from core.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER
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
            "MATCH (n) RETURN elementId(n) AS id, labels(n)[0] AS label, properties(n) AS props"
        )
        nodes = [
            {"id": r["id"], "label": r["label"], "properties": dict(r["props"])}
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
