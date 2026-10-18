from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

SpaceName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class SpaceCreate(BaseModel):
    name: SpaceName


class SpaceUpdate(BaseModel):
    name: SpaceName


class Space(BaseModel):
    id: str
    name: str
    created_at: datetime
    article_count: int
    entity_count: int
