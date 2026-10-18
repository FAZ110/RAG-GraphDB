from pydantic import BaseModel


class EntityHit(BaseModel):
    id: str
    name: str
    label: str
    space_id: str
    space_name: str
    score: float


class ArticleHit(BaseModel):
    id: str
    title: str | None
    url: str | None
    space_id: str
    space_name: str


class SearchResults(BaseModel):
    entities: list[EntityHit]
    articles: list[ArticleHit]
