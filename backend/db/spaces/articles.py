from neo4j import ManagedTransaction

from db.driver import get_driver, get_sync_driver, translates_neo4j_errors
from db.query_loader import load_queries
from services.articles.identity import content_hash, source_key

_QUERIES = load_queries(__file__)


@translates_neo4j_errors
async def upsert_articles(space_id: str, articles: list[dict], force: bool) -> list[dict]:
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
                    "force": force,
                },
            )
            results.append(dict(await res.single(strict=True)))
    return results


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
