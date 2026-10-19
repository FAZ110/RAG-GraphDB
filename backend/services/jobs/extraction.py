import uuid

import redis.asyncio as aioredis

from core.config import REDIS_URL
from db.spaces.articles import claim_for_retry, upsert_articles
from db.spaces.batches import assign_batch
from services.jobs.results import push_result, unchanged_result
from tasks.extract_task import extract_article_task

_TTL_SECONDS = 86400


# A job is also an upload: its id marks the articles, so the page can find the job's stream.
async def _start_job(article_ids: list[str]) -> str:
    job_id = str(uuid.uuid4())
    await assign_batch(job_id, article_ids)
    r = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        await r.set(f"job:{job_id}:total", len(article_ids), ex=_TTL_SECONDS)
    finally:
        await r.aclose()
    return job_id


async def start_extraction(space_id: str, articles: list[dict], provider: str, force: bool) -> str:
    """Store the articles in the space and queue extraction for those whose text is new
    or changed. Unchanged ones are reported to the job's stream straight away."""
    stored = await upsert_articles(space_id, articles, provider, force)
    job_id = await _start_job([row["id"] for row in stored])

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
            extract_article_task.delay(
                job_id=job_id, article_id=row["id"], title=title, provider=provider
            )
    return job_id


async def retry_extraction(
    space_id: str, article_ids: list[str] | None, provider: str | None
) -> str | None:
    """Queue the space's failed articles again as a new job; None when none had failed."""
    claimed = await claim_for_retry(space_id, article_ids)
    if not claimed:
        return None
    job_id = await _start_job([row["id"] for row in claimed])
    for row in claimed:
        extract_article_task.delay(
            job_id=job_id,
            article_id=row["id"],
            title=row["title"],
            provider=provider or row["provider"] or "local",
        )
    return job_id
