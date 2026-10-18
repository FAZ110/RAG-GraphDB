from neo4j import AsyncSession

from db.driver import get_driver, translates_neo4j_errors
from db.query_loader import load_queries
from db.spaces.articles import fail_stalled_articles

_QUERIES = load_queries(__file__)


async def _ids(session: AsyncSession, query: str, params: dict) -> list[str]:
    res = await session.run(_QUERIES[query], params)
    return [r["id"] async for r in res]


async def _stats(session: AsyncSession, batch_ids: list[str]) -> list[dict]:
    res = await session.run(_QUERIES["batch_stats"], {"batch_ids": batch_ids})
    return [{**r, "created_at": r["created_at"].to_native()} async for r in res]


@translates_neo4j_errors
async def assign_batch(batch_id: str, article_ids: list[str]) -> None:
    async with get_driver().session() as session:
        await (
            await session.run(
                _QUERIES["assign_batch"], {"batch_id": batch_id, "article_ids": article_ids}
            )
        ).consume()


@translates_neo4j_errors
async def latest_batch(space_id: str) -> dict | None:
    async with get_driver().session() as session:
        await fail_stalled_articles(session, space_id)
        ids = await _ids(session, "latest_batch_id", {"space_id": space_id})
        stats = await _stats(session, ids)
        return stats[0] if stats else None


@translates_neo4j_errors
async def running_batches() -> list[dict]:
    async with get_driver().session() as session:
        await fail_stalled_articles(session, None)
        return await _stats(session, await _ids(session, "running_batch_ids", {}))
