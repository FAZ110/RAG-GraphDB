from core.config import EMBEDDING_DIM
from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SYSTEM
from db.driver import translates_neo4j_errors

# Every statement is idempotent (IF NOT EXISTS), so the schema is applied on each
# API start. Neo4j Community supports uniqueness constraints only; property
# existence and node keys are Enterprise, so required fields are enforced in code.
_SCHEMA_STATEMENTS = load_queries(__file__).values()


@translates_neo4j_errors
async def ensure_schema() -> None:
    async def work(db: Runner) -> None:
        for statement in _SCHEMA_STATEMENTS:
            await db.run(statement, {"dim": EMBEDDING_DIM})

    await gate.auto(SYSTEM, work)
