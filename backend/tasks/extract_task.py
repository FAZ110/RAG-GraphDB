import json

import redis
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError
from openai import RateLimitError

from celery_app import celery_app
from core.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER, REDIS_URL
from db.graph_builder import build_statements
from db.json_validator import validate_graph_json
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
        result = _run_extraction(title, content, provider)
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


def _run_extraction(title: str, content: str, provider: str) -> dict:
    llm = LLMService(provider=provider)
    try:
        raw_json = llm.generate_graph_json(title, content)
        graph = validate_graph_json(raw_json)
        nodes_dicts = [n.model_dump() for n in graph.nodes]
        edges_dicts = [e.model_dump() for e in graph.edges]

        statements = build_statements(nodes_dicts, edges_dicts)
        try:
            with driver.session() as session:
                with session.begin_transaction() as tx:
                    for cypher, params in statements:
                        tx.run(cypher, params)
                    tx.commit()
        except Neo4jError as e:
            raise RuntimeError(f"Neo4j error: {e.message}") from e

        return {
            "title": title,
            "status": "ok",
            "nodes": nodes_dicts,
            "edges": edges_dicts,
            "nodes_count": len(graph.nodes),
            "edges_count": len(graph.edges),
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
