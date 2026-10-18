import json
from collections.abc import AsyncIterator

import redis.asyncio as aioredis
from redis.exceptions import TimeoutError as RedisTimeoutError

from core.config import REDIS_URL

_BLPOP_TIMEOUT = 30


async def job_events(job_id: str) -> AsyncIterator[str]:
    """SSE frames for a job: `start`, one `result` per article as it finishes, `done`."""
    r = aioredis.from_url(REDIS_URL, decode_responses=True, socket_timeout=_BLPOP_TIMEOUT + 5)
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
            batch = await r.lrange(results_key, offset, offset + 49)
            if not batch:
                break
            for raw in batch:
                yield f"event: result\ndata: {raw}\n\n"
            offset += len(batch)

        while offset < total:
            try:
                notification = await r.blpop(notify_key, timeout=_BLPOP_TIMEOUT)
            except RedisTimeoutError:
                notification = None

            if notification is None:
                batch = await r.lrange(results_key, offset, offset + 49)
                if not batch:
                    continue
                for raw in batch:
                    yield f"event: result\ndata: {raw}\n\n"
                offset += len(batch)
                continue

            while offset < total:
                batch = await r.lrange(results_key, offset, offset + 49)
                if not batch:
                    break
                for raw in batch:
                    yield f"event: result\ndata: {raw}\n\n"
                offset += len(batch)

        yield f"event: done\ndata: {json.dumps({'total': total})}\n\n"
    finally:
        await r.aclose()
