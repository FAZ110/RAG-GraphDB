from datetime import UTC, datetime, timedelta

from db.driver import get_driver, translates_neo4j_errors
from db.query_loader import load_queries
from db.spaces.articles import fail_stalled_articles

_QUERIES = load_queries(__file__)
_RECENT_SPACES = 4
_RECENT_ARTICLES = 6
ACTIVITY_DAYS = 140
_VISIT_GAP_MINUTES = 30


def _native(row) -> dict:
    return {k: v.to_native() if hasattr(v, "to_native") else v for k, v in row.items()}


@translates_neo4j_errors
async def home_overview(owner_id: str) -> dict:
    """Everything the start page shows: totals, what was used lately and the daily activity."""
    now = datetime.now(UTC)
    # A datetime, not a date: Cypher's DateTime >= Date is null.
    start = (now - timedelta(days=ACTIVITY_DAYS - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    params = {"owner_id": owner_id}

    async with get_driver().session() as session:

        async def rows(query: str, **extra) -> list[dict]:
            res = await session.run(_QUERIES[query], params | extra)
            return [_native(r) async for r in res]

        await fail_stalled_articles(session, None)
        [visit] = await rows("visit", gap_minutes=_VISIT_GAP_MINUTES)
        [totals] = await rows("totals", week=now - timedelta(days=7), since=visit["since"])
        spaces = await rows("recent_spaces", limit=_RECENT_SPACES)
        articles = await rows("recent_articles", limit=_RECENT_ARTICLES)
        failed = await rows("failed_articles")
        counts = await rows("activity", start=start)

    days: dict = {}
    for r in counts:
        day = days.setdefault(
            r["day"], {"day": r["day"], "articles": 0, "analyses": 0, "entities": 0}
        )
        day[r["kind"]] = r["count"]

    return {
        "since": visit["since"],
        "totals": totals,
        "recent_spaces": spaces,
        "recent_articles": articles,
        "failed": failed,
        "activity": list(days.values()),
    }
