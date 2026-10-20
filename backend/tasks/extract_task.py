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
    DEDUP_THRESHOLD,
    DEDUP_TOP_K,
    NEO4J_PASSWORD,
    NEO4J_URI,
    NEO4J_USER,
    REDIS_URL,
)
from db.graph.writer import build_statements
from db.json_validator import validate_graph_json
from db.query_loader import load_queries
from db.spaces.articles import fail_article, finish_article, release_article, start_article
from services.dedup import (
    DEDUP_LOG_KEY,
    DEDUP_LOG_MAX,
    MatchConfig,
    match_existing,
    merge_same_key,
    resolve_batch,
)
from services.embedding_service import get_embedding_service
from services.evidence import mentioning, numbered, split_sentences, to_spans
from services.jobs.results import push_result
from services.llm_service import LLMService


@celery_app.task(
    bind=True,
    rate_limit="10/m",
    max_retries=5,
    soft_time_limit=120,
    time_limit=130,
)
def extract_article_task(
    self, job_id: str, article_id: str, title: str | None, provider: str = "local"
) -> None:
    try:
        result = _run_extraction(job_id, article_id, provider)
    except SoftTimeLimitExceeded:
        result = _error_result(article_id, title, "Task timed out (120s) — article may be too long")
    except RateLimitError as exc:
        retry_after = 60
        if exc.response is not None:
            retry_after = int(float(exc.response.headers.get("retry-after", 60)))
        try:
            raise self.retry(exc=exc, countdown=retry_after) from exc
        except MaxRetriesExceededError:
            result = _error_result(article_id, title, "Rate limit exceeded - too much retries")

    if result["status"] == "error":
        fail_article(article_id, result["error"])
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
)


# The vector index cannot filter by space, so it is asked for many more neighbours than
# needed and those from other spaces are dropped.
_SEARCH_K = max(DEDUP_TOP_K * 20, 100)
_SIMILAR_IN_SPACE_CYPHER = load_queries(__file__)["similar_in_space"]


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
            "score": r["score"],
        }
        for r in res
    ]


def _embedding_text(node: dict) -> str:
    text = f"{node['label']}: {node['properties'].get('name', '')}"
    description = str(node["properties"].get("description") or "").strip()
    return f"{text} — {description}" if description else text


def _record_dedup_log(r: redis.Redis, job_id: str, title: str, entries: list[dict]) -> None:
    if not entries:
        return
    r.rpush(
        DEDUP_LOG_KEY,
        *(json.dumps({**e, "job_id": job_id, "title": title}) for e in entries),
    )
    r.ltrim(DEDUP_LOG_KEY, -DEDUP_LOG_MAX, -1)


def _run_extraction(job_id: str, article_id: str, provider: str) -> dict:
    article = start_article(article_id)
    if article is None:
        return _error_result(article_id, None, "Article no longer exists")
    space_id, title, content = article["space_id"], article["title"] or "", article["content"]
    llm = LLMService(provider=provider)
    try:
        sentences = split_sentences(content)
        raw_json = llm.generate_graph_json(title, numbered(content, sentences))
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
        texts = [_embedding_text(n) for n in nodes_dicts]
        vectors = embedder.embed_batch(texts)
        embeddings_map = {n["id"]: v for n, v in zip(nodes_dicts, vectors, strict=True)}

        dedup_log: list[dict] = []
        if DEDUP_ENABLED:
            nodes_dicts, edges_dicts = resolve_batch(
                nodes_dicts,
                edges_dicts,
                embeddings_map,
                _MATCH_CONFIG,
                dedup_log,
            )

        # Candidate lookup and writing share one lock, so parallel workers can't create the
        # same entity twice. Spaces don't share entities, so each has its own lock.
        r = redis.from_url(REDIS_URL)
        lock = r.lock(
            f"lock:graph-write:{space_id}", timeout=_LOCK_TIMEOUT, blocking_timeout=_LOCK_WAIT
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
                    )
                    nodes_dicts, edges_dicts = merge_same_key(nodes_dicts, edges_dicts)

                statements = build_statements(
                    nodes_dicts, edges_dicts, space_id, article_id, embeddings=embeddings_map
                )
                # The article's previous share is replaced in the same transaction, so a
                # failed write leaves the old graph intact.
                with session.begin_transaction() as tx:
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
