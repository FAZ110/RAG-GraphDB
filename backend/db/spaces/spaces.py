import uuid
from collections.abc import Mapping
from typing import Any

from neo4j.exceptions import ConstraintError

from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SpaceScope, UserScope
from db.driver import translates_neo4j_errors
from db.errors import SpaceNameTakenError

_QUERIES = load_queries(__file__)
# Batched, so clearing a large space is not one huge transaction.
_CLEAR_SPACE_STEPS = (
    "delete_space_articles",
    "delete_space_entities",
    "delete_space_suggestions",
    # Analyses only point at entities, so with the graph gone nothing is left of them.
    "delete_space_analyses",
)


def _space_from_row(row: Mapping[str, Any]) -> dict:
    return {
        "id": row["id"],
        "owner_id": row.get("owner_id"),
        "name": row["name"],
        "created_at": row["created_at"].to_native(),
        "article_count": row["article_count"],
        "entity_count": row["entity_count"],
    }


@translates_neo4j_errors
async def owned_space(scope: UserScope, space_id: str) -> SpaceScope | None:
    """The space's scope when it belongs to the user, the one way into a space's data."""
    row = await gate.single(scope, _QUERIES["owned_space"], {"requested_id": space_id})
    return SpaceScope(space_id=row["id"], owner_id=row["owner_id"]) if row else None


@translates_neo4j_errors
async def list_spaces(scope: UserScope) -> list[dict]:
    return [_space_from_row(r) for r in await gate.rows(scope, _QUERIES["list_spaces"])]


@translates_neo4j_errors
async def get_space(scope: SpaceScope) -> dict | None:
    row = await gate.single(scope, _QUERIES["get_space"])
    return _space_from_row(row) if row else None


@translates_neo4j_errors
async def create_space(scope: UserScope, name: str) -> dict:
    params = {"space_id": str(uuid.uuid4()), "name": name}
    try:
        [row] = await gate.change(scope, _QUERIES["create_space"], params)
    except ConstraintError as e:
        raise SpaceNameTakenError(name) from e
    return _space_from_row(row)


@translates_neo4j_errors
async def rename_space(scope: SpaceScope, name: str) -> dict | None:
    try:
        renamed = await gate.change(scope, _QUERIES["rename_space"], {"name": name})
    except ConstraintError as e:
        raise SpaceNameTakenError(name) from e
    return await get_space(scope) if renamed else None


@translates_neo4j_errors
async def reorder_spaces(scope: UserScope, space_ids: list[str]) -> None:
    """Unknown ids and other owners' spaces are skipped."""
    await gate.change(scope, _QUERIES["reorder_spaces"], {"space_ids": space_ids})


async def _clear(db: Runner) -> None:
    for step in _CLEAR_SPACE_STEPS:
        await db.run(_QUERIES[step])


@translates_neo4j_errors
async def clear_space(scope: SpaceScope) -> None:
    """Remove all articles of a space and the graph built from them; the space stays."""
    # CALL { } IN TRANSACTIONS needs auto-commit transactions.
    await gate.auto(scope, _clear)


@translates_neo4j_errors
async def delete_space(scope: SpaceScope) -> bool:
    """Delete a space with all its articles and entities. False if it did not exist."""

    async def work(db: Runner) -> bool:
        if await db.single(_QUERIES["get_space"]) is None:
            return False
        await _clear(db)
        await db.run(_QUERIES["delete_space"])
        return True

    return await gate.auto(scope, work)


@translates_neo4j_errors
async def get_extraction_settings(scope: SpaceScope) -> dict | None:
    row = await gate.single(scope, _QUERIES["get_extraction_settings"])
    return dict(row) if row else None


@translates_neo4j_errors
async def set_extraction_settings(
    scope: SpaceScope, rules: str | None, labels: list[str] | None
) -> dict | None:
    params = {"rules": rules, "labels": labels}
    rows = await gate.change(scope, _QUERIES["set_extraction_settings"], params)
    return dict(rows[0]) if rows else None
