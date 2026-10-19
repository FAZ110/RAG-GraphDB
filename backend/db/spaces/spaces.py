import uuid
from collections.abc import Mapping
from typing import Any

from neo4j import AsyncSession
from neo4j.exceptions import ConstraintError

from db.driver import get_driver, translates_neo4j_errors
from db.errors import SpaceNameTakenError
from db.query_loader import load_queries

_QUERIES = load_queries(__file__)
# Batched, so clearing a large space is not one huge transaction.
_CLEAR_SPACE_STEPS = ("delete_space_articles", "delete_space_entities")


def _space_from_row(row: Mapping[str, Any]) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"].to_native(),
        "article_count": row["article_count"],
        "entity_count": row["entity_count"],
    }


async def _fetch_space(session: AsyncSession, space_id: str) -> dict | None:
    res = await session.run(_QUERIES["get_space"], {"space_id": space_id})
    row = await res.single()
    return _space_from_row(row) if row else None


@translates_neo4j_errors
async def list_spaces() -> list[dict]:
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["list_spaces"])
        return [_space_from_row(r) async for r in res]


@translates_neo4j_errors
async def get_space(space_id: str) -> dict | None:
    async with get_driver().session() as session:
        return await _fetch_space(session, space_id)


@translates_neo4j_errors
async def create_space(name: str) -> dict:
    space_id = str(uuid.uuid4())
    async with get_driver().session() as session:
        try:
            await (
                await session.run(_QUERIES["create_space"], {"space_id": space_id, "name": name})
            ).consume()
        except ConstraintError as e:
            raise SpaceNameTakenError(name) from e
        return await _fetch_space(session, space_id)


@translates_neo4j_errors
async def rename_space(space_id: str, name: str) -> dict | None:
    async with get_driver().session() as session:
        try:
            res = await session.run(_QUERIES["rename_space"], {"space_id": space_id, "name": name})
            renamed = await res.single()
        except ConstraintError as e:
            raise SpaceNameTakenError(name) from e
        return await _fetch_space(session, space_id) if renamed else None


@translates_neo4j_errors
async def reorder_spaces(space_ids: list[str]) -> None:
    """Unknown ids are skipped."""
    async with get_driver().session() as session:
        await (await session.run(_QUERIES["reorder_spaces"], {"space_ids": space_ids})).consume()


async def _clear(session: AsyncSession, space_id: str) -> None:
    # CALL { } IN TRANSACTIONS needs an auto-commit transaction, hence session.run.
    for step in _CLEAR_SPACE_STEPS:
        await (await session.run(_QUERIES[step], {"space_id": space_id})).consume()


@translates_neo4j_errors
async def clear_space(space_id: str) -> None:
    """Remove all articles of a space and the graph built from them; the space stays."""
    async with get_driver().session() as session:
        await _clear(session, space_id)


@translates_neo4j_errors
async def delete_space(space_id: str) -> bool:
    """Delete a space with all its articles and entities. False if it did not exist."""
    async with get_driver().session() as session:
        if await _fetch_space(session, space_id) is None:
            return False
        await _clear(session, space_id)
        await (await session.run(_QUERIES["delete_space"], {"space_id": space_id})).consume()
    return True
