import uuid

import redis.asyncio as aioredis

from core.config import REDIS_URL
from db.spaces.articles import claim_for_retry, upsert_articles
from db.spaces.batches import assign_batch, cancel_batch, pause_batch, resume_batch
from services.jobs.events import job_owner_key
from services.jobs.results import cancelled_result, push_result, unchanged_result
from tasks.extract_task import drop_queued, queue_extraction

_TTL_SECONDS = 86400


# A job is also an upload: its id marks the articles, so the page can find the job's stream.
async def _start_job(article_ids: list[str], owner_id: str) -> str:
    job_id = str(uuid.uuid4())
    await assign_batch(job_id, article_ids)
    r = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        await r.set(f"job:{job_id}:total", len(article_ids), ex=_TTL_SECONDS)
        await r.set(job_owner_key(job_id), owner_id, ex=_TTL_SECONDS)
    finally:
        await r.aclose()
    return job_id


async def start_extraction(
    space_id: str, articles: list[dict], provider: str, force: bool, owner_id: str
) -> str:
    """Store the articles in the space and queue extraction for those whose text is new
    or changed. Unchanged ones are reported to the job's stream straight away."""
    stored = await upsert_articles(space_id, articles, provider, force)
    job_id = await _start_job([row["id"] for row in stored], owner_id)

    for article, row in zip(articles, stored, strict=True):
        title = article.get("title") or None
        if row["unchanged"]:
            push_result(
                job_id,
                unchanged_result(
                    row["id"], title, row["nodes_count"] or 0, row["edges_count"] or 0
                ),
            )
        else:
            queue_extraction(job_id, row["id"], title, provider, row["token"])
    return job_id


async def retry_extraction(
    space_id: str,
    article_ids: list[str] | None,
    provider: str | None,
    owner_id: str,
    status: str = "error",
) -> str | None:
    """Queue the space's failed (or cancelled) articles again as a new job; None when there
    were none."""
    claimed = await claim_for_retry(space_id, article_ids, status)
    if not claimed:
        return None
    job_id = await _start_job([row["id"] for row in claimed], owner_id)
    for row in claimed:
        queue_extraction(
            job_id, row["id"], row["title"], provider or row["provider"] or "local", row["token"]
        )
    return job_id


async def pause_extraction(space_id: str, batch_id: str) -> None:
    paused = await pause_batch(space_id, batch_id)
    drop_queued([row["token"] for row in paused])


async def resume_extraction(space_id: str, batch_id: str) -> None:
    for row in await resume_batch(space_id, batch_id):
        queue_extraction(
            batch_id, row["id"], row["title"], row["provider"] or "local", row["token"]
        )


async def cancel_extraction(space_id: str, batch_id: str) -> None:
    """Cancelled articles are reported here, so the job's stream can end."""
    cancelled = await cancel_batch(space_id, batch_id)
    drop_queued([row["token"] for row in cancelled])
    for row in cancelled:
        push_result(batch_id, cancelled_result(row["id"], row["title"]))
