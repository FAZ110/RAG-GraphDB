import uuid

import redis.asyncio as aioredis

from core.config import REDIS_URL
from db.spaces.articles import upsert_articles
from services.jobs.results import push_result, unchanged_result
from tasks.extract_task import extract_article_task

_TTL_SECONDS = 86400


async def start_extraction(space_id: str, articles: list[dict], provider: str, force: bool) -> str:
    """Store the articles in the space and queue extraction for those whose text is new
    or changed. Unchanged ones are reported to the job's stream straight away."""
    stored = await upsert_articles(space_id, articles, force)

    job_id = str(uuid.uuid4())
    r = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        await r.set(f"job:{job_id}:total", len(stored), ex=_TTL_SECONDS)
    finally:
        await r.aclose()

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
