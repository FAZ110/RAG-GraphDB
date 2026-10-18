from core.config import EMBEDDING_DIM
from db.driver import get_driver, translates_neo4j_errors
from db.query_loader import load_queries

# Every statement is idempotent (IF NOT EXISTS), so the schema is applied on each
# API start. Neo4j Community supports uniqueness constraints only; property
# existence and node keys are Enterprise, so required fields are enforced in code.
_SCHEMA_STATEMENTS = load_queries(__file__).values()


@translates_neo4j_errors
async def ensure_schema() -> None:
    async with get_driver().session() as session:
        for statement in _SCHEMA_STATEMENTS:
            await (await session.run(statement, {"dim": EMBEDDING_DIM})).consume()
