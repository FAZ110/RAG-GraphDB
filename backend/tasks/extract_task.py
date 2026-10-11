import logging
import uuid

import redis
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError
from openai import RateLimitError

from celery_app import celery_app
from core.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER, REDIS_URL
from db.graph_builder import build_statements
from db.json_validator import validate_graph_json
from db.postgres.articles import set_article_status
from db.postgres.mentions import save_mentions
from db.postgres.models import ArticleStatus
from schemas.requests import EdgeResult, ExtractResponse, NodeResult
from services.embedding_service import get_embedding_service
from services.llm_service import LLMService

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    rate_limit="10/m",
    max_retries=5,
    soft_time_limit=120,
    time_limit=130,
)
def extract_article_task(
    self,
    job_id: str,
    title: str,
    content: str,
    provider: str = "local",
    article_id: str | None = None,
) -> None:
    _record_status(article_id, ArticleStatus.PROCESSING)
    try:
        result = _run_extraction(title, content, provider, article_id)
    except SoftTimeLimitExceeded:
        result = _error_result(title, "Task timed out (120s) — article may be too long")
    except RateLimitError as exc:
        retry_after = 60
        if exc.response is not None:
            retry_after = int(float(exc.response.headers.get("retry-after", 60)))
        try:
            raise self.retry(exc=exc, countdown=retry_after) from exc
        except MaxRetriesExceededError:
            result = _error_result(title, "Rate limit exceeded - too much retries")

    _record_status(article_id, result.status, result.error)

    r = redis.from_url(REDIS_URL)
    r.rpush(f"job:{job_id}:results", result.model_dump_json())
    r.expire(f"job:{job_id}:results", 86400)
    r.rpush(f"job:{job_id}:notify", "1")
    r.expire(f"job:{job_id}:notify", 86400)


def _record_status(article_id: str | None, status: ArticleStatus, error: str | None = None) -> None:
    # Bookkeeping only: a Postgres failure must not stop the result from reaching the stream.
    if article_id is None:
        return
    try:
        set_article_status(uuid.UUID(article_id), status, error)
    except Exception:
        logger.exception("Failed to record status %s for article %s", status, article_id)


driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def _run_extraction(
    title: str, content: str, provider: str, article_id: str | None
) -> ExtractResponse:
    llm = LLMService(provider=provider)
    try:
        raw_json = llm.generate_graph_json(title, content)
        graph = validate_graph_json(raw_json)
        nodes_dicts = [n.model_dump() for n in graph.nodes]
        edges_dicts = [e.model_dump() for e in graph.edges]

        embedder = get_embedding_service()
        texts = [f"{n.label}: {n.properties.get('name', '')}" for n in graph.nodes]
        vectors = embedder.embed_batch(texts)
        embeddings_map = {n.id: v for n, v in zip(graph.nodes, vectors, strict=True)}

        if article_id is not None:
            save_mentions(uuid.UUID(article_id), graph.nodes, graph.edges, vectors)

        statements = build_statements(nodes_dicts, edges_dicts, embeddings=embeddings_map)
        try:
            with driver.session() as session:
                with session.begin_transaction() as tx:
                    for cypher, params in statements:
                        tx.run(cypher, params)
                    tx.commit()
        except Neo4jError as e:
            raise RuntimeError(f"Neo4j error: {e.message}") from e

        return ExtractResponse(
            title=title,
            status=ArticleStatus.OK,
            nodes=[NodeResult.model_validate(n) for n in nodes_dicts],
            edges=[EdgeResult.model_validate(e) for e in edges_dicts],
            nodes_count=len(graph.nodes),
            edges_count=len(graph.edges),
        )
    except RateLimitError:
        raise
    except Exception as e:
        return _error_result(title, str(e))


def _error_result(title: str, error: str) -> ExtractResponse:
    return ExtractResponse(title=title, status=ArticleStatus.ERROR, error=error)
