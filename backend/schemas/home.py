from datetime import date, datetime

from pydantic import BaseModel


class HomeTotals(BaseModel):
    spaces: int
    articles: int
    entities: int
    analyses: int
    # Added (articles, entities) or edited (analyses) in the last 7 days.
    week_articles: int
    week_entities: int
    week_analyses: int
    # Added since the previous visit.
    new_articles: int
    new_entities: int


class RecentSpace(BaseModel):
    id: str
    name: str
    article_count: int
    entity_count: int
    last_used: datetime


class RecentArticle(BaseModel):
    id: str
    space_id: str
    space_name: str
    title: str | None
    url: str | None
    status: str
    nodes_count: int | None
    created_at: datetime


class FailedArticles(BaseModel):
    space_id: str
    space_name: str
    article_ids: list[str]


class ActivityDay(BaseModel):
    day: date
    articles: int
    analyses: int
    entities: int


class Home(BaseModel):
    # The previous visit, null on the first one.
    since: datetime | None
    totals: HomeTotals
    recent_spaces: list[RecentSpace]
    recent_articles: list[RecentArticle]
    failed: list[FailedArticles]
    # Only days with something in them, oldest first.
    activity: list[ActivityDay]
