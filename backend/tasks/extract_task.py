import json
from collections.abc import Callable

import redis
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded
from neo4j import GraphDatabase
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
    NEO4J_PASSWORD,
    NEO4J_URI,
    NEO4J_USER,
    REDIS_URL,
)
from db.graph.writer import GRAPH_WRITE_LOCK, build_statements
from db.json_validator import validate_graph_json
from db.query_loader import load_queries
from db.settings import custom_provider_limit
from db.spaces.articles import (
    fail_article,
    finish_article,
    keep_waiting,
    release_article,
    start_article,
    still_running,
)
from services.dedup import (
    DEDUP_LOG_KEY,
    DEDUP_LOG_MAX,
    MatchConfig,
    match_existing,
    merge_same_key,
    resolve_batch,
)
from services.embedding_service import embedding_text, get_embedding_service
from services.evidence import mentioning, numbered, split_sentences, to_spans
from services.jobs.results import push_result
from services.llm_service import CUSTOM_PROVIDER_PREFIX, LLMService

CUSTOM_QUEUE = "custom"

_TASK_OPTIONS = {"bind": True, "max_retries": 5, "soft_time_limit": 120, "time_limit": 130}
_CUSTOM_TIME_LIMIT = 630
# A task waiting for a free slot of its model goes back to the queue instead of holding a
# worker thread; 360 tries 10 s apart is an hour of waiting at most.
_SLOT_KEY = "llm-slot:{provider}:{index}"
_SLOT_RETRY_DELAY = 10
_SLOT_MAX_RETRIES = 360
# Every 30th try (~5 min) the waiting article's clock is set back, well within the 15 min
# after which an untouched article counts as stalled.
_SLOT_KEEP_WAITING_EVERY = 30


class ModelBusy(Exception):
    """Every slot of the article's model is taken by other articles."""


def _take_slot(provider: str) -> Callable[[], None]:
    """A slot of the user's own model, or ModelBusy; returns its release, safe to call twice.
    At most `max_parallel` requests reach one model at once: a local model answers them one by
    one, and the rest would wait on an open connection until a tunnel cuts it off (~120 s).
    Server models have no slots."""
    if not provider.startswith(CUSTOM_PROVIDER_PREFIX):
        return lambda: None
    limit = custom_provider_limit(provider.removeprefix(CUSTOM_PROVIDER_PREFIX))
    r = redis.from_url(REDIS_URL)
    for index in range(limit):
        # Expires after the task's hard limit, so a killed worker frees its slot.
        slot = r.lock(
            _SLOT_KEY.format(provider=provider, index=index), timeout=_CUSTOM_TIME_LIMIT + 60
        )
        if slot.acquire(blocking=False):
            break
    else:
        raise ModelBusy

    def release() -> None:
        try:
            slot.release()
        except redis.exceptions.LockError:
            pass  # released already, or expired meanwhile

    return release


# Server models share one API key, so they share its rate limit.
@celery_app.task(**_TASK_OPTIONS, rate_limit="10/m")
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


driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

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
_SIMILAR_IN_SPACE_CYPHER = _QUERIES["similar_in_space"]


def _find_candidates(session, space_id: str, vec: list[float]) -> list[dict]:
    res = session.run(
        _SIMILAR_IN_SPACE_CYPHER,
        {"space_id": space_id, "search_k": _SEARCH_K, "top_k": DEDUP_TOP_K, "vec": vec},
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
        for r in res
    ]


def _record_dedup_log(r: redis.Redis, job_id: str, title: str, entries: list[dict]) -> None:
    if not entries:
        return
    r.rpush(
        DEDUP_LOG_KEY,
        *(json.dumps({**e, "job_id": job_id, "title": title}) for e in entries),
    )
    r.ltrim(DEDUP_LOG_KEY, -DEDUP_LOG_MAX, -1)


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
    space_id, title, content = article["space_id"], article["title"] or "", article["content"]
    # Checked again here: a retry reuses the article's last model, which may no longer be allowed.
    if not provider.startswith(CUSTOM_PROVIDER_PREFIX) and not article["server_models"]:
        return _error_result(article_id, title, "Model serwera nie jest dostępny dla tego konta")
    try:
        llm = LLMService(provider=provider, owner_id=article["owner_id"])
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
            GRAPH_WRITE_LOCK.format(space_id=space_id),
            timeout=_LOCK_TIMEOUT,
            blocking_timeout=_LOCK_WAIT,
        )
        try:
            with lock, driver.session() as session:
                if DEDUP_ENABLED:
                    match_existing(
                        nodes_dicts,
                        embeddings_map,
                        lambda vec: _find_candidates(session, space_id, vec),
                        _MATCH_CONFIG,
                        dedup_log,
                        suggestions,
                    )
                    nodes_dicts, edges_dicts = merge_same_key(nodes_dicts, edges_dicts)

                statements = build_statements(
                    nodes_dicts, edges_dicts, space_id, article_id, embeddings=embeddings_map
                )
                statements += [
                    (_QUERIES["suggest_duplicate"], {**s, "space_id": space_id})
                    for s in suggestions
                ]
                with session.begin_transaction() as tx:
                    if not still_running(tx, article_id, token):
                        return None
                    release_article(tx, article_id)
                    for cypher, params in statements:
                        tx.run(cypher, params)
                    finish_article(
                        tx,
                        article_id,
                        article["content_hash"],
                        len(nodes_dicts),
                        len(edges_dicts),
                    )
                    tx.commit()
        except Neo4jError as e:
            raise RuntimeError(f"Neo4j error: {e.message}") from e

        _record_dedup_log(r, job_id, title, dedup_log)

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
