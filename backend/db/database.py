from neo4j import AsyncGraphDatabase
from neo4j.exceptions import Neo4jError
from core.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


async def execute_cypher(cypher: str) -> None:
    try:
        async with get_driver().session() as session:
            await session.run(cypher)
    except Neo4jError as e:
        raise RuntimeError(f"Neo4j error: {e.message}") from e



async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
