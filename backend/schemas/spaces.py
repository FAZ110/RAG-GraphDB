from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

SpaceName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class SpaceCreate(BaseModel):
    name: SpaceName


class SpaceUpdate(BaseModel):
    name: SpaceName


class SpaceOrder(BaseModel):
    space_ids: list[str]


class Space(BaseModel):
    id: str
    name: str
    created_at: datetime
    article_count: int
    entity_count: int


class ArticleStats(BaseModel):
    total: int
    # Counts per status: ok, pending, processing, error.
    by_status: dict[str, int]


class LabelCount(BaseModel):
    label: str
    count: int


class EntityStats(BaseModel):
    total: int
    by_label: list[LabelCount]


class SpaceStats(BaseModel):
    articles: ArticleStats
    entities: EntityStats
    relationships: int
