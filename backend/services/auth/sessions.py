import hashlib
import secrets

import redis.asyncio as aioredis

from core.config import REDIS_URL, SESSION_TTL_HOURS

SESSION_COOKIE = "atlas_session"
SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 3600

_redis: aioredis.Redis | None = None


def _client() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


# Only the token's hash is stored, so whoever reads Redis cannot sign in with it.
def _key(token: str) -> str:
    return f"session:{hashlib.sha256(token.encode()).hexdigest()}"


def _user_key(user_id: str) -> str:
    return f"user_sessions:{user_id}"


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    key = _key(token)
    async with _client().pipeline(transaction=True) as pipe:
        pipe.set(key, user_id, ex=SESSION_TTL_SECONDS)
        pipe.sadd(_user_key(user_id), key)
        pipe.expire(_user_key(user_id), SESSION_TTL_SECONDS)
        await pipe.execute()
    return token


async def session_user_id(token: str) -> str | None:
    return await _client().get(_key(token))


async def end_session(token: str) -> None:
    key = _key(token)
    user_id = await _client().getdel(key)
    if user_id:
        await _client().srem(_user_key(user_id), key)


async def end_user_sessions(user_id: str) -> None:
    keys = await _client().smembers(_user_key(user_id))
    await _client().delete(*keys, _user_key(user_id))


async def too_many(key: str, limit: int) -> int | None:
    """Seconds until `key` may try again when it already failed `limit` times, else None."""
    client = _client()
    count = await client.get(f"limit:{key}")
    if count is None or int(count) < limit:
        return None
    return max(await client.ttl(f"limit:{key}"), 1)


async def count_attempt(key: str, window_seconds: int) -> None:
    async with _client().pipeline(transaction=True) as pipe:
        pipe.incr(f"limit:{key}")
        pipe.expire(f"limit:{key}", window_seconds, nx=True)
        await pipe.execute()


async def clear_attempts(key: str) -> None:
    await _client().delete(f"limit:{key}")
