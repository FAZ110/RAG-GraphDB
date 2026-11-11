import redis

from core.config import REDIS_URL
from services.jobs.llm_quota import server_llm_wait

MINUTE_START = 1_800_000_000 - 1_800_000_000 % 60


def test_calls_within_the_limit_go_at_once():
    r = redis.from_url(REDIS_URL)
    assert [server_llm_wait(r, 2, now=MINUTE_START + i) for i in range(2)] == [0, 0]


def test_call_over_the_limit_waits_for_the_next_minute():
    r = redis.from_url(REDIS_URL)
    for _ in range(2):
        server_llm_wait(r, 2, now=MINUTE_START)
    assert server_llm_wait(r, 2, now=MINUTE_START + 45) == 16
    assert server_llm_wait(r, 2, now=MINUTE_START + 60) == 0


def test_every_worker_counts_against_one_limit():
    workers = [redis.from_url(REDIS_URL) for _ in range(3)]
    waits = [server_llm_wait(r, 2, now=MINUTE_START) for r in workers]
    assert waits.count(0) == 2
