import redis
import redis.asyncio as aioredis

from core.config import REDIS_URL, STALE_PROCESSING_MINUTES
from db.access import gate, sync_gate
from db.access.queries import load_queries
from db.access.runner import Runner, SyncRunner
from db.access.scopes import SYSTEM, SpaceScope, UserScope
from db.driver import translates_neo4j_errors
from services.articles.identity import content_hash, source_key

_QUERIES = load_queries(__file__)
_QUEUE_ALIVE_KEY = "queue-alive:{queue}"
_QUEUES = ("shared", "custom")


def mark_queue_alive(queue: str) -> None:
    key = _QUEUE_ALIVE_KEY.format(queue=queue)
    redis.from_url(REDIS_URL).set(key, 1, ex=STALE_PROCESSING_MINUTES * 60)


async def _stale_params() -> dict:
    r = aioredis.from_url(REDIS_URL)
    try:
        alive = await r.mget([_QUEUE_ALIVE_KEY.format(queue=q) for q in _QUEUES])
    except redis.exceptions.RedisError:
        alive = [None] * len(_QUEUES)
    finally:
        await r.aclose()
    return {
        "stale_minutes": STALE_PROCESSING_MINUTES,
        **{f"{q}_alive": a is not None for q, a in zip(_QUEUES, alive, strict=True)},
    }


@translates_neo4j_errors
async def upsert_articles(
    scope: SpaceScope, articles: list[dict], provider: str, force: bool
) -> list[dict]:
    """Store uploaded articles in a space; `unchanged` marks those already processed
    with the same text."""

    rows = [
        {
            "source_key": source_key(article.get("url", ""), article["content"]),
            "url": article.get("url") or None,
            "title": article.get("title") or None,
            "content": article["content"],
            "content_hash": content_hash(article["content"]),
        }
        for article in articles
    ]
    params = {"articles": rows, "provider": provider, "force": force}
    stored = await gate.change(scope, _QUERIES["upsert_articles"], params)
    return [dict(r) for r in stored]


@translates_neo4j_errors
async def fail_unqueued(scope: SpaceScope, tokens: list[str]) -> None:
    await gate.change(scope, _QUERIES["fail_unqueued"], {"tokens": tokens})


@translates_neo4j_errors
async def fail_stalled_in_space(scope: SpaceScope) -> None:
    await gate.change(scope, _QUERIES["fail_stalled_in_space"], await _stale_params())


@translates_neo4j_errors
async def fail_stalled_of_owner(scope: UserScope) -> None:
    await gate.change(scope, _QUERIES["fail_stalled_of_owner"], await _stale_params())


@translates_neo4j_errors
async def claim_for_retry(
    scope: SpaceScope, article_ids: list[str] | None, status: str = "error"
) -> list[dict]:
    """Queue the space's failed (or cancelled) articles again, all of them when `article_ids`
    is None."""
    await fail_stalled_in_space(scope)
    params = {"article_ids": article_ids, "status": status}
    return [dict(r) for r in await gate.change(scope, _QUERIES["claim_for_retry"], params)]


@translates_neo4j_errors
async def list_articles(scope: SpaceScope) -> list[dict]:
    await fail_stalled_in_space(scope)
    return [_with_native_dates(r) for r in await gate.rows(scope, _QUERIES["list_articles"])]


@translates_neo4j_errors
async def get_article(scope: SpaceScope, article_id: str) -> dict | None:
    row = await gate.single(scope, _QUERIES["get_article"], {"article_id": article_id})
    return _with_native_dates(row) if row else None


def _with_native_dates(record) -> dict:
    return {
        **record,
        "created_at": record["created_at"].to_native(),
        "processed_at": record["processed_at"].to_native() if record["processed_at"] else None,
    }


@translates_neo4j_errors
async def delete_articles(scope: SpaceScope, article_ids: list[str]) -> dict[str, list[str]]:
    """Remove articles with their share of the graph in one transaction. Ones being
    extracted are left alone, as the running task would write their graph back."""

    async def work(db: Runner) -> dict[str, list[str]]:
        rows = await db.rows(_QUERIES["article_statuses"], {"article_ids": article_ids})
        statuses = {r["id"]: r["status"] for r in rows}
        deleted = [i for i, status in statuses.items() if status != "processing"]
        queued = [r["token"] for r in rows if r["status"] in ("pending", "paused") and r["token"]]
        for name in (
            "release_articles_relationships",
            "release_articles_mentions",
            "delete_articles",
        ):
            await db.run(_QUERIES[name], {"article_ids": deleted})
        return {
            "deleted": deleted,
            "processing": [i for i in statuses if i not in deleted],
            "queued_tokens": queued,
        }

    return await gate.write(scope, work)


def keep_waiting(article_id: str, token: str) -> None:
    """Guarded by the task's queue token, like start_article."""
    params = {"article_id": article_id, "token": token}
    sync_gate.write(SYSTEM, lambda db: db.run(_QUERIES["keep_waiting"], params))


def start_article(article_id: str, token: str) -> dict | None:
    """None when the article is gone; `runnable` is false when this task no longer owns it.
    The queue token stands in for a user here: only the task holding it can start the article."""
    row = sync_gate.change(
        SYSTEM, _QUERIES["start_article"], {"article_id": article_id, "token": token}
    )
    return dict(row) if row else None


def fail_article(article_id: str, error: str, token: str) -> bool:
    """False when the article was paused or cancelled meanwhile: nothing to report."""
    params = {"article_id": article_id, "error": error, "token": token}
    return sync_gate.change(SYSTEM, _QUERIES["fail_article"], params)["report"]


def still_running(db: SyncRunner, article_id: str, token: str) -> bool:
    row = db.single(_QUERIES["still_running"], {"article_id": article_id, "token": token})
    return bool(row and row["running"])


def release_article(db: SyncRunner, article_id: str) -> None:
    """Remove the article's previous share of the graph: its id on relationships,
    relationships no article backs any more, its MENTIONS and orphaned entities."""
    db.run(_QUERIES["release_articles_relationships"], {"article_ids": [article_id]})
    db.run(_QUERIES["release_articles_mentions"], {"article_ids": [article_id]})


def finish_article(
    db: SyncRunner,
    article_id: str,
    content_hash: str,
    nodes_count: int,
    edges_count: int,
    preset: str | None,
    labels: list[str],
    strict_labels: bool,
) -> None:
    db.run(
        _QUERIES["finish_article"],
        {
            "article_id": article_id,
            "content_hash": content_hash,
            "nodes_count": nodes_count,
            "edges_count": edges_count,
            "preset": preset,
            "labels": labels,
            "strict_labels": strict_labels,
        },
    )


@translates_neo4j_errors
async def search_articles(scope: UserScope, q: str, limit: int) -> list[dict]:
    rows = await gate.rows(scope, _QUERIES["search_articles"], {"q": q, "limit": limit})
    return [dict(r) for r in rows]
