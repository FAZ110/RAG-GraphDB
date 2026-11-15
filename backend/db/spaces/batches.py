from db.access import gate
from db.access.queries import load_queries
from db.access.scopes import SpaceScope, UserScope
from db.driver import translates_neo4j_errors
from db.spaces.articles import fail_stalled_in_space, fail_stalled_of_owner

_QUERIES = load_queries(__file__)


async def _stats(scope: SpaceScope | UserScope, batch_ids: list[str]) -> list[dict]:
    rows = await gate.rows(scope, _QUERIES["batch_stats"], {"batch_ids": batch_ids})
    return [{**r, "created_at": r["created_at"].to_native()} for r in rows]


@translates_neo4j_errors
async def assign_batch(scope: SpaceScope, batch_id: str, article_ids: list[str]) -> None:
    params = {"batch_id": batch_id, "article_ids": article_ids}
    await gate.change(scope, _QUERIES["assign_batch"], params)


@translates_neo4j_errors
async def latest_batch(scope: SpaceScope) -> dict | None:
    await fail_stalled_in_space(scope)
    ids = [r["id"] for r in await gate.rows(scope, _QUERIES["latest_batch_id"])]
    stats = await _stats(scope, ids)
    return stats[0] if stats else None


@translates_neo4j_errors
async def running_batches(scope: UserScope) -> list[dict]:
    await fail_stalled_of_owner(scope)
    ids = [r["id"] for r in await gate.rows(scope, _QUERIES["running_batch_ids"])]
    return await _stats(scope, ids)


async def _change(query: str, scope: SpaceScope, batch_id: str) -> list[dict]:
    return [dict(r) for r in await gate.change(scope, _QUERIES[query], {"batch_id": batch_id})]


@translates_neo4j_errors
async def pause_batch(scope: SpaceScope, batch_id: str) -> list[dict]:
    return await _change("pause_batch", scope, batch_id)


@translates_neo4j_errors
async def resume_batch(scope: SpaceScope, batch_id: str) -> list[dict]:
    return await _change("resume_batch", scope, batch_id)


@translates_neo4j_errors
async def cancel_batch(scope: SpaceScope, batch_id: str) -> list[dict]:
    return await _change("cancel_batch", scope, batch_id)
