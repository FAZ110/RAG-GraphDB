import asyncio
import logging
import uuid
from collections.abc import Callable

import redis.asyncio as aioredis

from core.config import REDIS_URL
from db.access.scopes import SpaceScope
from db.spaces.articles import claim_for_retry, fail_unqueued, upsert_articles
from db.spaces.batches import assign_batch, cancel_batch, pause_batch, resume_batch
from services.jobs.events import job_owner_key
from services.jobs.results import cancelled_result, push_result, unchanged_result
from tasks.extract_task import drop_queued, queue_extraction

_TTL_SECONDS = 86400

log = logging.getLogger("uvicorn.error")


async def _off_loop(work: Callable[[], None]) -> None:
    await asyncio.to_thread(work)


async def _queue(space: SpaceScope, job_id: str, rows: list[dict]) -> None:
    queued = 0

    def queue_all() -> None:
        nonlocal queued
        for row in rows:
            queue_extraction(job_id, row["id"], row["title"], row["provider"], row["token"])
            queued += 1

    try:
        await _off_loop(queue_all)
    except Exception:
        await fail_unqueued(space, [row["token"] for row in rows[queued:]])
        raise


# A job is also an upload: its id marks the articles, so the page can find the job's stream.
async def _start_job(space: SpaceScope, article_ids: list[str]) -> str:
    job_id = str(uuid.uuid4())
    await assign_batch(space, job_id, article_ids)
    r = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        await r.set(f"job:{job_id}:total", len(article_ids), ex=_TTL_SECONDS)
        await r.set(job_owner_key(job_id), space.owner_id, ex=_TTL_SECONDS)
    finally:
        await r.aclose()
    return job_id


async def start_extraction(
    space: SpaceScope, articles: list[dict], provider: str, force: bool
) -> str:
    """Store the articles in the space and queue extraction for those whose text is new
    or changed. Unchanged ones are reported to the job's stream straight away."""
    stored = await upsert_articles(space, articles, provider, force)
    latest = {row["id"]: (article, row) for article, row in zip(articles, stored, strict=True)}
    job_id = await _start_job(space, list(latest))

    unchanged, to_queue = [], []
    for article, row in latest.values():
        title = article.get("title") or None
        if row["unchanged"]:
            nodes, edges = row["nodes_count"] or 0, row["edges_count"] or 0
            unchanged.append(unchanged_result(row["id"], title, nodes, edges))
        else:
            to_queue.append(
                {"id": row["id"], "title": title, "provider": provider, "token": row["token"]}
            )

    def report_unchanged() -> None:
        for result in unchanged:
            push_result(job_id, result)

    await _off_loop(report_unchanged)
    await _queue(space, job_id, to_queue)
    return job_id


async def retry_extraction(
    space: SpaceScope,
    article_ids: list[str] | None,
    provider: str | None,
    status: str = "error",
) -> str | None:
    """Queue the space's failed (or cancelled) articles again as a new job; None when there
    were none."""
    claimed = await claim_for_retry(space, article_ids, status)
    if not claimed:
        return None
    job_id = await _start_job(space, [row["id"] for row in claimed])
    rows = [{**row, "provider": provider or row["provider"] or "local"} for row in claimed]
    await _queue(space, job_id, rows)
    return job_id


async def pause_extraction(space: SpaceScope, batch_id: str) -> None:
    paused = await pause_batch(space, batch_id)
    await _off_loop(lambda: drop_queued([row["token"] for row in paused]))


async def resume_extraction(space: SpaceScope, batch_id: str) -> None:
    resumed = await resume_batch(space, batch_id)
    rows = [{**row, "provider": row["provider"] or "local"} for row in resumed]
    await _queue(space, batch_id, rows)


async def drop_tasks(tokens: list[str]) -> None:
    try:
        await _off_loop(lambda: drop_queued(tokens))
    except Exception:
        log.exception("Could not drop %d queued extraction tasks", len(tokens))


async def cancel_extraction(space: SpaceScope, batch_id: str) -> None:
    """Cancelled articles are reported here, so the job's stream can end."""
    cancelled = await cancel_batch(space, batch_id)

    def report_all() -> None:
        drop_queued([row["token"] for row in cancelled])
        for row in cancelled:
            push_result(batch_id, cancelled_result(row["id"], row["title"]))

    await _off_loop(report_all)
