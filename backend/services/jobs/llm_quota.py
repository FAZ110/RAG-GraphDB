import time

import redis

_WINDOW_SECONDS = 60


def server_llm_wait(r: redis.Redis, limit: int, now: float | None = None) -> int:
    """Seconds until the server's model may be called again; 0 means a call was just counted.
    Counted in Redis per minute, so every worker shares the one API key's limit, which
    Celery's own rate_limit, kept per worker, would multiply by their number."""
    now = time.time() if now is None else now
    key = f"llm:server:{int(now // _WINDOW_SECONDS)}"
    with r.pipeline() as pipe:
        pipe.incr(key)
        pipe.expire(key, _WINDOW_SECONDS * 2)
        count, _ = pipe.execute()
    if count <= limit:
        return 0
    return int(_WINDOW_SECONDS - now % _WINDOW_SECONDS) + 1
