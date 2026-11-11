from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SpaceScope
from db.driver import translates_neo4j_errors
from db.spaces.articles import fail_stalled_in_space

_QUERIES = load_queries(__file__)
_STATUSES = ("ok", "pending", "processing", "error", "paused", "cancelled")


@translates_neo4j_errors
async def space_stats(scope: SpaceScope) -> dict:
    await fail_stalled_in_space(scope)

    async def work(db: Runner) -> dict:
        rows = await db.rows(_QUERIES["article_statuses"])
        by_status = dict.fromkeys(_STATUSES, 0) | {r["status"]: r["count"] for r in rows}
        rows = await db.rows(_QUERIES["entity_labels"])
        by_label = [{"label": r["label"], "count": r["count"]} for r in rows]
        relationships = (await db.single(_QUERIES["relationship_count"], strict=True))["count"]
        return {
            "articles": {"total": sum(by_status.values()), "by_status": by_status},
            "entities": {"total": sum(e["count"] for e in by_label), "by_label": by_label},
            "relationships": relationships,
        }

    return await gate.read(scope, work)
