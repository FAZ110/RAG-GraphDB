from datetime import UTC, datetime, timedelta

from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import UserScope
from db.driver import translates_neo4j_errors
from db.spaces.articles import fail_stalled_of_owner

_QUERIES = load_queries(__file__)
_RECENT_SPACES = 4
_RECENT_ARTICLES = 6
ACTIVITY_DAYS = 140
_VISIT_GAP_MINUTES = 30


def _native(row) -> dict:
    return {k: v.to_native() if hasattr(v, "to_native") else v for k, v in row.items()}


@translates_neo4j_errors
async def home_overview(scope: UserScope) -> dict:
    """Everything the start page shows: totals, what was used lately and the daily activity."""
    now = datetime.now(UTC)
    # A datetime, not a date: Cypher's DateTime >= Date is null.
    start = (now - timedelta(days=ACTIVITY_DAYS - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    await fail_stalled_of_owner(scope)

    async def work(db: Runner) -> tuple:
        async def rows(query: str, **params) -> list[dict]:
            return [_native(r) for r in await db.rows(_QUERIES[query], params)]

        # The visit is recorded, so this runs as a write.
        [visit] = await rows("visit", gap_minutes=_VISIT_GAP_MINUTES)
        [totals] = await rows("totals", week=now - timedelta(days=7), since=visit["since"])
        spaces = await rows("recent_spaces", limit=_RECENT_SPACES)
        articles = await rows("recent_articles", limit=_RECENT_ARTICLES)
        failed = await rows("failed_articles")
        counts = await rows("activity", start=start)
        return visit, totals, spaces, articles, failed, counts

    visit, totals, spaces, articles, failed, counts = await gate.write(scope, work)

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
