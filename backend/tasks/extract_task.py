from collections.abc import Callable

import redis
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded
from neo4j.exceptions import Neo4jError
from openai import RateLimitError

from celery_app import celery_app
from core.config import (
    DEDUP_ENABLED,
    DEDUP_LEXICAL_MIN,
    DEDUP_NAME_MIN_SCORE,
    DEDUP_SUGGEST_MIN,
    DEDUP_THRESHOLD,
    DEDUP_TOP_K,
    REDIS_URL,
    SERVER_LLM_PER_MINUTE,
)
from db.access import sync_gate
from db.access.queries import load_queries
from db.access.runner import SyncRunner
from db.access.scopes import SpaceScope
from db.graph.writer import GRAPH_WRITE_LOCK, build_statements
from db.json_validator import validate_graph_json
from db.settings import custom_provider_is_local
from db.spaces.articles import (
    fail_article,
    finish_article,
    keep_waiting,
    release_article,
    start_article,
    still_running,
)
from services.dedup import (
    MatchConfig,
    match_existing,
    merge_same_key,
    resolve_batch,
)
from services.embedding_service import embedding_text, get_embedding_service
from services.evidence import mentioning, numbered, split_sentences, to_spans
from services.jobs.llm_quota import server_llm_wait
from services.jobs.results import push_result
from services.llm_service import CUSTOM_PROVIDER_PREFIX, LLMService

CUSTOM_QUEUE = "custom"

_TASK_OPTIONS = {"bind": True, "max_retries": 5, "soft_time_limit": 120, "time_limit": 130}
_CUSTOM_TIME_LIMIT = 630
# A task waiting for a free slot of its model goes back to the queue instead of holding a
# worker thread; 360 tries 10 s apart is an hour of waiting at most.
_SLOT_KEY = "llm-slot:local:{provider_id}"
_SLOT_RETRY_DELAY = 10
_SLOT_MAX_RETRIES = 360
# Every 30th try (~5 min) the waiting article's clock is set back, well within the 15 min
# after which an untouched article counts as stalled.
_SLOT_KEEP_WAITING_EVERY = 30


class ModelBusy(Exception):
    """The article's local model is busy with another article."""


def _take_slot(provider: str) -> Callable[[], None]:
    """The slot of the user's local model, or ModelBusy; returns its release, safe to call
    twice. A local model gets one request at a time: it answers them one by one, and the rest
    would wait on an open connection until a tunnel cuts it off (~120 s). Cloud and server
    models have no slot."""
    if not provider.startswith(CUSTOM_PROVIDER_PREFIX):
        return lambda: None
    provider_id = provider.removeprefix(CUSTOM_PROVIDER_PREFIX)
    if not custom_provider_is_local(provider_id):
        return lambda: None
    # Expires after the task's hard limit, so a killed worker frees it.
    slot = redis.from_url(REDIS_URL).lock(
        _SLOT_KEY.format(provider_id=provider_id), timeout=_CUSTOM_TIME_LIMIT + 60
    )
    if not slot.acquire(blocking=False):
        raise ModelBusy

    def release() -> None:
        try:
            slot.release()
        except redis.exceptions.LockError:
            pass  # released already, or expired meanwhile

    return release


# Server models share one API key, so they share its rate limit: Celery's per worker by default,
# one counted across all workers when SERVER_LLM_PER_MINUTE is set.
@celery_app.task(**_TASK_OPTIONS, rate_limit=None if SERVER_LLM_PER_MINUTE else "10/m")
def extract_article_task(
    self,
    job_id: str,
    article_id: str,
    title: str | None,
    provider: str = "local",
    token: str | None = None,
) -> None:
    _extract(self, job_id, article_id, title, provider, token)


# Users' own models run on their own keys: a separate queue and worker, no server limit,
# so they never wait behind server-model jobs.
# A longer limit: a model on the user's own computer may need minutes for one article.
@celery_app.task(
    **{**_TASK_OPTIONS, "soft_time_limit": 600, "time_limit": _CUSTOM_TIME_LIMIT},
    queue=CUSTOM_QUEUE,
)
def extract_custom_article_task(
    self, job_id: str, article_id: str, title: str | None, provider: str, token: str | None = None
) -> None:
    _extract(self, job_id, article_id, title, provider, token)


def queue_extraction(
    job_id: str, article_id: str, title: str | None, provider: str, token: str
) -> None:
    """The article's queue token doubles as the task id, so a pause or cancel can drop it."""
    task = (
        extract_custom_article_task
        if provider.startswith(CUSTOM_PROVIDER_PREFIX)
        else extract_article_task
    )
    task.apply_async(
        kwargs={
            "job_id": job_id,
            "article_id": article_id,
            "title": title,
            "provider": provider,
            "token": token,
        },
        task_id=token,
    )


def drop_queued(tokens: list[str]) -> None:
    """Workers keep revoked ids in memory only; after a restart the token check skips them."""
    if tokens:
        celery_app.control.revoke(tokens)


def _extract(
    self, job_id: str, article_id: str, title: str | None, provider: str, token: str | None
) -> None:
    if SERVER_LLM_PER_MINUTE and not provider.startswith(CUSTOM_PROVIDER_PREFIX):
        wait = server_llm_wait(redis.from_url(REDIS_URL), SERVER_LLM_PER_MINUTE)
        if wait:
            # Waiting for a slot is not a failure, so it never uses up the task's retries.
            raise self.retry(countdown=wait, max_retries=None)
    try:
        result = _run_extraction(job_id, article_id, provider, token)
    except SoftTimeLimitExceeded:
        limit = self.soft_time_limit
        result = _error_result(
            article_id, title, f"Task timed out ({limit}s) — article may be too long"
        )
    except ModelBusy as exc:
        if token and self.request.retries % _SLOT_KEEP_WAITING_EVERY == 0:
            keep_waiting(article_id, token)
        try:
            raise self.retry(countdown=_SLOT_RETRY_DELAY, max_retries=_SLOT_MAX_RETRIES) from exc
        except MaxRetriesExceededError:
            result = _error_result(
                article_id, title, "Model był zajęty przez inne artykuły zbyt długo (ponad godzinę)"
            )
    except RateLimitError as exc:
        retry_after = 60
        if exc.response is not None:
            retry_after = int(float(exc.response.headers.get("retry-after", 60)))
        try:
            raise self.retry(countdown=retry_after) from exc
        except MaxRetriesExceededError:
            result = _error_result(article_id, title, "Rate limit exceeded - too much retries")

    # None: the article was paused or cancelled, and whoever did that reports it.
    if result is None:
        return
    if result["status"] == "error" and not fail_article(article_id, result["error"], token):
        return
    push_result(job_id, result)


def _error_result(article_id: str, title: str | None, error: str) -> dict:
    return {
        "article_id": article_id,
        "title": title,
        "status": "error",
        "nodes": [],
        "edges": [],
        "nodes_count": 0,
        "edges_count": 0,
        "error": error,
    }


_LOCK_TIMEOUT = 60
_LOCK_WAIT = 90

_MATCH_CONFIG = MatchConfig(
    threshold=DEDUP_THRESHOLD,
    name_min_score=DEDUP_NAME_MIN_SCORE,
    lexical_min=DEDUP_LEXICAL_MIN,
    suggest_min=DEDUP_SUGGEST_MIN,
)


_SEARCH_K = max(DEDUP_TOP_K * 20, 100)
_QUERIES = load_queries(__file__)


def _find_candidates(db: SyncRunner, vec: list[float]) -> list[dict]:
    rows = db.rows(
        _QUERIES["similar_in_space"], {"search_k": _SEARCH_K, "top_k": DEDUP_TOP_K, "vec": vec}
    )
    return [
        {
            "name": r["name"],
            "label": r["label"],
            "description": r["description"],
            "type": r["type"],
            "aliases": r["aliases"],
            "score": 2 * r["score"] - 1,
        }
        for r in rows
    ]


def _run_extraction(job_id: str, article_id: str, provider: str, token: str | None) -> dict | None:
    # First, before any database write: a task waiting for a busy model costs a read and a
    # Redis call per try, not an article update.
    release_slot = _take_slot(provider)
    try:
        return _process_article(job_id, article_id, provider, token, release_slot)
    finally:
        release_slot()


def _process_article(
    job_id: str,
    article_id: str,
    provider: str,
    token: str | None,
    release_slot: Callable[[], None],
) -> dict | None:
    article = start_article(article_id, token)
    if article is None:
        return _error_result(article_id, None, "Article no longer exists")
    if not article["runnable"]:
        return None
    title, content = article["title"] or "", article["content"]
    if article["owner_id"] is None:
        return _error_result(article_id, title, "Article's space no longer exists")
    # The article's own space, read under the task's queue token: the one scope a task gets.
    space = SpaceScope(space_id=article["space_id"], owner_id=article["owner_id"])
    # Checked again here: a retry reuses the article's last model, which may no longer be allowed.
    if not provider.startswith(CUSTOM_PROVIDER_PREFIX) and not article["server_models"]:
        return _error_result(article_id, title, "Model serwera nie jest dostępny dla tego konta")
    try:
        llm = LLMService(provider=provider, scope=space)
        sentences = split_sentences(content)
        raw_json = llm.generate_graph_json(
            title, numbered(content, sentences), article["rules"], article["labels"]
        )
        release_slot()  # the model is free for the next article while this one is written
        graph = validate_graph_json(raw_json)
        nodes_dicts = [n.model_dump() for n in graph.nodes]
        edges_dicts = [e.model_dump() for e in graph.edges]
        names = {n["id"]: [n["properties"]["name"], *n["aliases"]] for n in nodes_dicts}
        for node in nodes_dicts:
            node["evidence"] = to_spans(node["evidence"], content, sentences) or mentioning(
                content, sentences, names[node["id"]]
            )
        for edge in edges_dicts:
            edge["evidence"] = to_spans(edge["evidence"], content, sentences) or mentioning(
                content, sentences, names[edge["source"]], names[edge["target"]]
            )

        embedder = get_embedding_service()
        texts = [
            embedding_text(
                n["label"], n["properties"].get("name", ""), n["properties"].get("description")
            )
            for n in nodes_dicts
        ]
        vectors = embedder.embed_batch(texts)
        embeddings_map = {n["id"]: v for n, v in zip(nodes_dicts, vectors, strict=True)}

        dedup_log: list[dict] = []
        suggestions: list[dict] = []
        if DEDUP_ENABLED:
            nodes_dicts, edges_dicts = resolve_batch(
                nodes_dicts,
                edges_dicts,
                embeddings_map,
                _MATCH_CONFIG,
                dedup_log,
            )

        r = redis.from_url(REDIS_URL)
        lock = r.lock(
            GRAPH_WRITE_LOCK.format(space_id=space.space_id),
            timeout=_LOCK_TIMEOUT,
            blocking_timeout=_LOCK_WAIT,
        )
        try:
            with lock:
                if DEDUP_ENABLED:
                    match_existing(
                        nodes_dicts,
                        embeddings_map,
                        lambda vec: sync_gate.read(space, lambda db: _find_candidates(db, vec)),
                        _MATCH_CONFIG,
                        dedup_log,
                        suggestions,
                    )
                    nodes_dicts, edges_dicts = merge_same_key(nodes_dicts, edges_dicts)

                statements = build_statements(
                    nodes_dicts, edges_dicts, article_id, embeddings=embeddings_map
                )
                statements += [(_QUERIES["suggest_duplicate"], s) for s in suggestions]

                def write(db: SyncRunner) -> bool:
                    if not still_running(db, article_id, token):
                        return False
                    release_article(db, article_id)
                    for query, params in statements:
                        db.run(query, params)
                    finish_article(
                        db, article_id, article["content_hash"], len(nodes_dicts), len(edges_dicts)
                    )
                    return True

                if not sync_gate.write(space, write):
                    return None
        except Neo4jError as e:
            raise RuntimeError(f"Neo4j error: {e.message}") from e

        return {
            "article_id": article_id,
            "title": title,
            "status": "ok",
            "nodes": nodes_dicts,
            "edges": edges_dicts,
            "nodes_count": len(nodes_dicts),
            "edges_count": len(edges_dicts),
            "error": None,
        }
    except RateLimitError:
        raise
    except Exception as e:
        return _error_result(article_id, title, str(e))
