import uuid
from collections.abc import Mapping
from typing import Any

from neo4j.exceptions import ConstraintError

from db.driver import get_driver, translates_neo4j_errors
from db.errors import SpaceNameTakenError

_SPACE_FIELDS = """s.id AS id, s.name AS name, s.created_at AS created_at,
       COUNT { MATCH (a:Article {space_id: s.id}) } AS article_count,
       COUNT { MATCH (e:Entity {space_id: s.id}) } AS entity_count"""

LIST_SPACES_CYPHER = f"""
MATCH (s:Space)
RETURN {_SPACE_FIELDS}
ORDER BY s.created_at
"""

GET_SPACE_CYPHER = f"""
MATCH (s:Space {{id: $space_id}})
RETURN {_SPACE_FIELDS}
"""

CREATE_SPACE_CYPHER = f"""
CREATE (s:Space {{id: $space_id, name: $name, created_at: datetime()}})
RETURN {_SPACE_FIELDS}
"""

RENAME_SPACE_CYPHER = f"""
MATCH (s:Space {{id: $space_id}})
SET s.name = $name
RETURN {_SPACE_FIELDS}
"""

# Space data is found through the indexed `space_id` property, not through
# relationships, so each label is deleted on its own. Batching keeps a large
# space from building one huge transaction.
_DELETE_BY_SPACE_CYPHER = """
MATCH (n:{label} {{space_id: $space_id}})
CALL {{ WITH n DETACH DELETE n }} IN TRANSACTIONS OF 1000 ROWS
"""

DELETE_SPACE_CYPHER = """
MATCH (s:Space {id: $space_id})
DELETE s
"""

_SPACE_DATA_LABELS = ("Article", "Entity")


def _space_from_row(row: Mapping[str, Any]) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"].to_native(),
        "article_count": row["article_count"],
        "entity_count": row["entity_count"],
    }


@translates_neo4j_errors
async def list_spaces() -> list[dict]:
    async with get_driver().session() as session:
        res = await session.run(LIST_SPACES_CYPHER)
        return [_space_from_row(r) async for r in res]


@translates_neo4j_errors
async def get_space(space_id: str) -> dict | None:
    async with get_driver().session() as session:
        res = await session.run(GET_SPACE_CYPHER, {"space_id": space_id})
        row = await res.single()
    return _space_from_row(row) if row else None


@translates_neo4j_errors
async def create_space(name: str) -> dict:
    params = {"space_id": str(uuid.uuid4()), "name": name}
    try:
        async with get_driver().session() as session:
            res = await session.run(CREATE_SPACE_CYPHER, params)
            row = await res.single(strict=True)
    except ConstraintError as e:
        raise SpaceNameTakenError(name) from e
    return _space_from_row(row)


@translates_neo4j_errors
async def rename_space(space_id: str, name: str) -> dict | None:
    try:
        async with get_driver().session() as session:
            res = await session.run(RENAME_SPACE_CYPHER, {"space_id": space_id, "name": name})
            row = await res.single()
    except ConstraintError as e:
        raise SpaceNameTakenError(name) from e
    return _space_from_row(row) if row else None


@translates_neo4j_errors
async def delete_space(space_id: str) -> bool:
    """Delete a space with all its articles and entities. False if it did not exist."""
    async with get_driver().session() as session:
        res = await session.run(GET_SPACE_CYPHER, {"space_id": space_id})
        if await res.single() is None:
            return False
        # CALL { } IN TRANSACTIONS needs an auto-commit transaction, hence session.run.
        for label in _SPACE_DATA_LABELS:
            res = await session.run(
                _DELETE_BY_SPACE_CYPHER.format(label=label), {"space_id": space_id}
            )
            await res.consume()
        res = await session.run(DELETE_SPACE_CYPHER, {"space_id": space_id})
        await res.consume()
    return True
