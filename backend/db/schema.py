from core.config import EMBEDDING_DIM
from db.driver import get_driver, translates_neo4j_errors

# Every statement is idempotent (IF NOT EXISTS), so the schema is applied on each
# API start. Neo4j Community supports uniqueness constraints only; property
# existence and node keys are Enterprise, so required fields are enforced in code.
SCHEMA_STATEMENTS = [
    "CREATE CONSTRAINT space_id IF NOT EXISTS FOR (s:Space) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT space_name IF NOT EXISTS FOR (s:Space) REQUIRE s.name IS UNIQUE",
    "CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE",
    "CREATE INDEX article_space IF NOT EXISTS FOR (a:Article) ON (a.space_id)",
    "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
    (
        "CREATE CONSTRAINT entity_key IF NOT EXISTS "
        "FOR (e:Entity) REQUIRE (e.space_id, e.label, e.name) IS UNIQUE"
    ),
    "CREATE INDEX entity_space IF NOT EXISTS FOR (e:Entity) ON (e.space_id)",
    (
        "CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS "
        "FOR (n:Entity) ON (n.embedding) "
        "OPTIONS {indexConfig: {`vector.dimensions`: $dim, "
        "`vector.similarity_function`: 'cosine'}}"
    ),
]


@translates_neo4j_errors
async def ensure_schema() -> None:
    async with get_driver().session() as session:
        for statement in SCHEMA_STATEMENTS:
            result = await session.run(statement, {"dim": EMBEDDING_DIM})
            await result.consume()
