import json
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from redis.exceptions import TimeoutError as RedisTimeoutError

from core.config import REDIS_URL
from schemas.requests import BulkExtractRequest, JobSubmitResponse
from tasks.extract_task import extract_article_task

router = APIRouter()

_BLPOP_TIMEOUT = 30


def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(REDIS_URL, decode_responses=True)


def _get_redis_stream() -> aioredis.Redis:
    return aioredis.from_url(REDIS_URL, decode_responses=True, socket_timeout=_BLPOP_TIMEOUT + 5)


@router.post("/extract", response_model=JobSubmitResponse)
async def submit_extract_job(request: BulkExtractRequest) -> JobSubmitResponse:
    job_id = str(uuid.uuid4())
    r = _get_redis()
    try:
        await r.set(f"job:{job_id}:total", len(request.articles), ex=3600)
    finally:
        await r.aclose()
    for article in request.articles:
        extract_article_task.delay(
            job_id=job_id,
            title=article.title,
            content=article.content,
            provider=request.provider,
        )
    return JobSubmitResponse(job_id=job_id)


@router.get("/extract/stream/{job_id}")
async def stream_extract_results(job_id: str):
    async def event_generator():
        r = _get_redis_stream()
        results_key = f"job:{job_id}:results"
        notify_key = f"job:{job_id}:notify"
        try:
            raw_total = await r.get(f"job:{job_id}:total")
            if raw_total is None:
                yield 'event: error\ndata: {"error": "job not found"}\n\n'
                return
            total = int(raw_total)
            yield f"event: start\ndata: {json.dumps({'total': total, 'job_id': job_id})}\n\n"

            offset = 0

            while offset < total:
                raw = await r.lindex(results_key, offset)
                if raw is None:
                    break
                yield f"event: result\ndata: {raw}\n\n"
                offset += 1

            while offset < total:
                try:
                    notification = await r.blpop(notify_key, timeout=_BLPOP_TIMEOUT)
                except RedisTimeoutError:
                    notification = None

                if notification is None:
                    raw = await r.lindex(results_key, offset)
                    if raw is None:
                        continue
                    yield f"event: result\ndata: {raw}\n\n"
                    offset += 1

                while offset < total:
                    raw = await r.lindex(results_key, offset)
                    if raw is None:
                        break
                    yield f"event: result\ndata: {raw}\n\n"
                    offset += 1

            yield f"event: done\ndata: {json.dumps({'total': total})}\n\n"
        finally:
            await r.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
