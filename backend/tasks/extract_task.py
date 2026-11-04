import json

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
from db.spaces.articles import (
    fail_article,
    finish_article,
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
@celery_app.task(**_TASK_OPTIONS, queue=CUSTOM_QUEUE)
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
        result = _error_result(article_id, title, "Task timed out (120s) — article may be too long")
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
