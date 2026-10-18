from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints


class ArticleIn(BaseModel):
    url: str = ""
    title: str = ""
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ArticlesUpload(BaseModel):
    articles: list[ArticleIn]
    provider: str = "local"
    # Re-extract articles even when their text is unchanged since the last run.
    force: bool = False


class Article(BaseModel):
    id: str
    url: str | None
    title: str | None
    status: str
    error: str | None
    nodes_count: int | None
    edges_count: int | None
    created_at: datetime
    processed_at: datetime | None
    batch_id: str | None = None


class MentionedEntity(BaseModel):
    name: str
    label: str


class ArticleRelationship(BaseModel):
    source: str
    source_label: str
    type: str
    target: str
    target_label: str


class ArticleDetail(Article):
    content: str
    entities: list[MentionedEntity]
    relationships: list[ArticleRelationship]


class ArticlesRetry(BaseModel):
    # All failed articles of the space when left out.
    article_ids: list[str] | None = None
    # The model each article was last sent to when left out.
    provider: str | None = None


class ArticlesDelete(BaseModel):
    article_ids: Annotated[list[str], Field(min_length=1)]


class ArticlesDeleted(BaseModel):
    deleted: list[str]
    # Articles being extracted are kept; ids not in the space are left out of both lists.
    processing: list[str]
