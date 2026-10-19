from db.driver import get_driver, translates_neo4j_errors
from db.query_loader import load_queries
from db.spaces.articles import fail_stalled_articles

_QUERIES = load_queries(__file__)
_STATUSES = ("ok", "pending", "processing", "error")


@translates_neo4j_errors
async def space_stats(space_id: str) -> dict:
    params = {"space_id": space_id}
    async with get_driver().session() as session:
        await fail_stalled_articles(session, space_id)
        res = await session.run(_QUERIES["article_statuses"], params)
        by_status = dict.fromkeys(_STATUSES, 0) | {r["status"]: r["count"] async for r in res}

        res = await session.run(_QUERIES["entity_labels"], params)
        by_label = [{"label": r["label"], "count": r["count"]} async for r in res]

        res = await session.run(_QUERIES["relationship_count"], params)
        relationships = (await res.single(strict=True))["count"]

    return {
        "articles": {"total": sum(by_status.values()), "by_status": by_status},
        "entities": {"total": sum(e["count"] for e in by_label), "by_label": by_label},
        "relationships": relationships,
    }
