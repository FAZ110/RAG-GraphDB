import json

import redis

from core.config import REDIS_URL

_TTL_SECONDS = 86400


def push_result(job_id: str, result: dict) -> None:
    """Hand one article's result to the job's SSE stream."""
    r = redis.from_url(REDIS_URL)
    r.rpush(f"job:{job_id}:results", json.dumps(result))
    r.expire(f"job:{job_id}:results", _TTL_SECONDS)
    r.rpush(f"job:{job_id}:notify", "1")
    r.expire(f"job:{job_id}:notify", _TTL_SECONDS)


def unchanged_result(
    article_id: str, title: str | None, nodes_count: int, edges_count: int
) -> dict:
    return {
        "article_id": article_id,
        "title": title,
        "status": "ok",
        "unchanged": True,
        "nodes": [],
        "edges": [],
        "nodes_count": nodes_count,
        "edges_count": edges_count,
        "error": None,
    }
