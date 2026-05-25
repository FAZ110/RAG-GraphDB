import asyncio
import json

import redis
from neo4j import AsyncGraphDatabase
from neo4j.exceptions import Neo4jError

from celery_app import celery_app
from core.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER, REDIS_URL
from db.graph_builder import build_statements
from db.json_validator import validate_graph_json
from services.llm_service import LLMService


@celery_app.task
def extract_article_task(job_id: str, title: str, content: str) -> None:
    result = asyncio.run(_run_extraction(title, content))
    r = redis.from_url(REDIS_URL)
    r.rpush(f"job:{job_id}:results", json.dumps(result))
    r.expire(f"job:{job_id}:results", 3600)


async def _run_extraction(title: str, content: str) -> dict:
    driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    try:
        llm = LLMService()
        raw_json = await llm.generate_graph_json(title, content)
        graph = validate_graph_json(raw_json)
        nodes_dicts = [n.model_dump() for n in graph.nodes]
        edges_dicts = [e.model_dump() for e in graph.edges]

        statements = build_statements(nodes_dicts, edges_dicts)
        try:
            async with driver.session() as session:
                async with await session.begin_transaction() as tx:
                    for cypher, params in statements:
                        await tx.run(cypher, params)
                    await tx.commit()
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
    finally:
        await driver.close()
