import uuid

import redis.asyncio as aioredis

from core.config import REDIS_URL
from db.access.scopes import SpaceScope
from db.spaces.articles import claim_for_retry, upsert_articles
from db.spaces.batches import assign_batch, cancel_batch, pause_batch, resume_batch
from services.jobs.events import job_owner_key
from services.jobs.results import cancelled_result, push_result, unchanged_result
from tasks.extract_task import drop_queued, queue_extraction

_TTL_SECONDS = 86400


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
    job_id = await _start_job(space, [row["id"] for row in stored])

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
    for row in claimed:
        queue_extraction(
            job_id, row["id"], row["title"], provider or row["provider"] or "local", row["token"]
        )
    return job_id


async def pause_extraction(space: SpaceScope, batch_id: str) -> None:
    paused = await pause_batch(space, batch_id)
    drop_queued([row["token"] for row in paused])


async def resume_extraction(space: SpaceScope, batch_id: str) -> None:
    for row in await resume_batch(space, batch_id):
        queue_extraction(
            batch_id, row["id"], row["title"], row["provider"] or "local", row["token"]
        )


async def cancel_extraction(space: SpaceScope, batch_id: str) -> None:
    """Cancelled articles are reported here, so the job's stream can end."""
    cancelled = await cancel_batch(space, batch_id)
    drop_queued([row["token"] for row in cancelled])
    for row in cancelled:
        push_result(batch_id, cancelled_result(row["id"], row["title"]))
