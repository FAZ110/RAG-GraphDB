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
from db.graph_builder import build_statements
from db.graph_queries import SIMILAR_NODES_CYPHER
from db.json_validator import validate_graph_json
from services.dedup import (
    DEDUP_LOG_KEY,
    DEDUP_LOG_MAX,
    MatchConfig,
    match_existing,
    merge_same_key,
    resolve_batch,
)
from services.embedding_service import get_embedding_service
from services.llm_service import LLMService


@celery_app.task(
    bind=True,
    rate_limit="10/m",
    max_retries=5,
    soft_time_limit=120,
    time_limit=130,
)
def extract_article_task(
    self, job_id: str, title: str, content: str, provider: str = "local"
) -> None:
    try:
        result = _run_extraction(job_id, title, content, provider)
    except SoftTimeLimitExceeded:
        result = {
            "title": title,
            "status": "error",
            "nodes": [],
            "edges": [],
            "nodes_count": 0,
            "edges_count": 0,
            "error": "Task timed out (120s) — article may be too long",
        }
    except RateLimitError as exc:
        retry_after = 60
        if exc.response is not None:
            retry_after = int(float(exc.response.headers.get("retry-after", 60)))
        try:
            raise self.retry(exc=exc, countdown=retry_after) from exc
        except MaxRetriesExceededError:
            result = {
                "title": title,
                "status": "error",
                "nodes": [],
                "edges": [],
                "nodes_count": 0,
                "edges_count": 0,
                "error": "Rate limit exceeded - too much retries",
            }

    r = redis.from_url(REDIS_URL)
    r.rpush(f"job:{job_id}:results", json.dumps(result))
    r.expire(f"job:{job_id}:results", 86400)
    r.rpush(f"job:{job_id}:notify", "1")
    r.expire(f"job:{job_id}:notify", 86400)


driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

_GRAPH_WRITE_LOCK = "lock:graph-write"
_LOCK_TIMEOUT = 60
_LOCK_WAIT = 90

_MATCH_CONFIG = MatchConfig(
    threshold=DEDUP_THRESHOLD,
    name_min_score=DEDUP_NAME_MIN_SCORE,
    lexical_min=DEDUP_LEXICAL_MIN,
)


def _find_candidates(session, vec: list[float]) -> list[dict]:
    res = session.run(SIMILAR_NODES_CYPHER, {"top_k": DEDUP_TOP_K, "vec": vec})
    return [{"name": r["name"], "label": r["label"], "score": r["score"]} for r in res]


def _record_dedup_log(r: redis.Redis, job_id: str, title: str, entries: list[dict]) -> None:
    # TEMP: do celów testowych, odczyt przez GET /debug/dedup
    if not entries:
        return
    r.rpush(
        DEDUP_LOG_KEY,
        *(json.dumps({**e, "job_id": job_id, "title": title}) for e in entries),
    )
    r.ltrim(DEDUP_LOG_KEY, -DEDUP_LOG_MAX, -1)


def _run_extraction(job_id: str, title: str, content: str, provider: str) -> dict:
    llm = LLMService(provider=provider)
    try:
        raw_json = llm.generate_graph_json(title, content)
        graph = validate_graph_json(raw_json)
        nodes_dicts = [n.model_dump() for n in graph.nodes]
        edges_dicts = [e.model_dump() for e in graph.edges]

        embedder = get_embedding_service()
        texts = [f"{n['label']}: {n['properties'].get('name', '')}" for n in nodes_dicts]
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

        # Wyszukiwanie kandydatów i zapis pod jedną blokadą, żeby równoległe workery
        # nie utworzyły tego samego bytu dwa razy.
        r = redis.from_url(REDIS_URL)
        lock = r.lock(_GRAPH_WRITE_LOCK, timeout=_LOCK_TIMEOUT, blocking_timeout=_LOCK_WAIT)
        try:
            with lock, driver.session() as session:
                if DEDUP_ENABLED:
                    match_existing(
                        nodes_dicts,
                        embeddings_map,
                        lambda vec: _find_candidates(session, vec),
                        _MATCH_CONFIG,
                        dedup_log,
                    )
                    nodes_dicts, edges_dicts = merge_same_key(nodes_dicts, edges_dicts)

                statements = build_statements(nodes_dicts, edges_dicts, embeddings=embeddings_map)
                with session.begin_transaction() as tx:
                    for cypher, params in statements:
                        tx.run(cypher, params)
                    tx.commit()
        except Neo4jError as e:
            raise RuntimeError(f"Neo4j error: {e.message}") from e

        _record_dedup_log(r, job_id, title, dedup_log)

        return {
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
        return {
            "title": title,
            "status": "error",
            "nodes": [],
            "edges": [],
            "nodes_count": 0,
            "edges_count": 0,
            "error": str(e),
        }
