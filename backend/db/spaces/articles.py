from neo4j import AsyncManagedTransaction, AsyncSession, ManagedTransaction

from core.config import STALE_PROCESSING_MINUTES
from db.driver import get_driver, get_sync_driver, translates_neo4j_errors
from db.query_loader import load_queries
from services.articles.identity import content_hash, source_key

_QUERIES = load_queries(__file__)


@translates_neo4j_errors
async def upsert_articles(
    space_id: str, articles: list[dict], provider: str, force: bool
) -> list[dict]:
    """Store uploaded articles in a space; `unchanged` marks those already processed
    with the same text."""
    results = []
    async with get_driver().session() as session:
        for article in articles:
            text = article["content"]
            res = await session.run(
                _QUERIES["upsert_article"],
                {
                    "space_id": space_id,
                    "source_key": source_key(article.get("url", ""), text),
                    "url": article.get("url") or None,
                    "title": article.get("title") or None,
                    "content": text,
                    "content_hash": content_hash(text),
                    "provider": provider,
                    "force": force,
                },
            )
            results.append(dict(await res.single(strict=True)))
    return results


async def fail_stalled_articles(session: AsyncSession, space_id: str | None) -> None:
    params = {"space_id": space_id, "stale_minutes": STALE_PROCESSING_MINUTES}
    await (await session.run(_QUERIES["fail_stalled_articles"], params)).consume()


@translates_neo4j_errors
async def claim_for_retry(space_id: str, article_ids: list[str] | None) -> list[dict]:
    """Queue the space's failed articles again, all of them when `article_ids` is None."""
    async with get_driver().session() as session:
        await fail_stalled_articles(session, space_id)
        res = await session.run(
            _QUERIES["claim_for_retry"], {"space_id": space_id, "article_ids": article_ids}
        )
        return [dict(r) async for r in res]


@translates_neo4j_errors
async def list_articles(space_id: str) -> list[dict]:
    async with get_driver().session() as session:
        await fail_stalled_articles(session, space_id)
        res = await session.run(_QUERIES["list_articles"], {"space_id": space_id})
        return [_with_native_dates(r) async for r in res]


@translates_neo4j_errors
async def get_article(space_id: str, article_id: str) -> dict | None:
    async with get_driver().session() as session:
        res = await session.run(
            _QUERIES["get_article"], {"space_id": space_id, "article_id": article_id}
        )
        row = await res.single()
    return _with_native_dates(row) if row else None


def _with_native_dates(record) -> dict:
    return {
        **record,
        "created_at": record["created_at"].to_native(),
        "processed_at": record["processed_at"].to_native() if record["processed_at"] else None,
    }


@translates_neo4j_errors
async def delete_articles(space_id: str, article_ids: list[str]) -> dict[str, list[str]]:
    """Remove articles with their share of the graph in one transaction. Ones being
    extracted are left alone, as the running task would write their graph back."""

    async def work(tx: AsyncManagedTransaction) -> dict[str, list[str]]:
        res = await tx.run(
            _QUERIES["article_statuses"], {"space_id": space_id, "article_ids": article_ids}
        )
        statuses = {r["id"]: r["status"] async for r in res}
        deleted = [i for i, status in statuses.items() if status != "processing"]
        for article_id in deleted:
            for name in (
                "release_article_relationships",
                "release_article_mentions",
                "delete_article",
            ):
                await (await tx.run(_QUERIES[name], {"article_id": article_id})).consume()
        return {"deleted": deleted, "processing": [i for i in statuses if i not in deleted]}

    async with get_driver().session() as session:
        return await session.execute_write(work)


def start_article(article_id: str) -> dict | None:
    with get_sync_driver().session() as session:
        row = session.run(_QUERIES["start_article"], {"article_id": article_id}).single()
    return dict(row) if row else None


def fail_article(article_id: str, error: str) -> None:
    with get_sync_driver().session() as session:
        session.run(_QUERIES["fail_article"], {"article_id": article_id, "error": error}).consume()


def release_article(tx: ManagedTransaction, article_id: str) -> None:
    """Remove the article's previous share of the graph: its id on relationships,
    relationships no article backs any more, its MENTIONS and orphaned entities."""
    tx.run(_QUERIES["release_article_relationships"], {"article_id": article_id}).consume()
    tx.run(_QUERIES["release_article_mentions"], {"article_id": article_id}).consume()


def finish_article(
    tx: ManagedTransaction, article_id: str, content_hash: str, nodes_count: int, edges_count: int
) -> None:
    tx.run(
        _QUERIES["finish_article"],
        {
            "article_id": article_id,
            "content_hash": content_hash,
            "nodes_count": nodes_count,
            "edges_count": edges_count,
        },
    ).consume()
