# TEMP: endpoints for testing deduplication; remove together with the logging in tasks/extract_task.py
import json
from collections import Counter

import redis.asyncio as aioredis
from fastapi import APIRouter, Query

from core.config import REDIS_URL
from services.dedup import DEDUP_LOG_KEY

router = APIRouter(prefix="/debug")


def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(REDIS_URL, decode_responses=True)


@router.get("/dedup")
async def get_dedup_log(limit: int = Query(100, ge=1, le=5000)):
    r = _get_redis()
    try:
        raw = await r.lrange(DEDUP_LOG_KEY, 0, -1)
    finally:
        await r.aclose()
    entries = [json.loads(e) for e in raw]
    return {
        "total": len(entries),
        "by_stage": Counter(e["stage"] for e in entries),
        "by_reason": Counter(e["reason"] for e in entries),
        "entries": entries[-limit:][::-1],
    }


@router.delete("/dedup")
async def clear_dedup_log():
    r = _get_redis()
    try:
        await r.delete(DEDUP_LOG_KEY)
    finally:
        await r.aclose()
    return {"message": "ok"}
