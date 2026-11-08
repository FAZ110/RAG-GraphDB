from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
# Labels and relationship types become Neo4j labels/types: uppercase identifiers only.
Identifier = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_upper=True, pattern=r"^[^\W\d]\w*$", max_length=60),
]


class EntityCreate(BaseModel):
    name: Text
    label: Identifier
    type: Text | None = None
    description: str | None = None
    aliases: list[Text] = []


class EntityUpdate(BaseModel):
    """Only the fields sent are changed."""

    name: Text | None = None
    label: Identifier | None = None
    type: Text | None = None
    description: str | None = None
    aliases: list[Text] | None = None


class EntityMerge(BaseModel):
    keep_id: str
    merge_id: str


class RelationshipCreate(BaseModel):
    source_id: str
    target_id: str
    type: Identifier


class RelationshipUpdate(BaseModel):
    type: Identifier


# Requests about entities already picked, e.g. those on an analysis canvas.
_MAX_IDS = 2000


class EntityIds(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=_MAX_IDS)


class CommonQuery(BaseModel):
    ids: list[str] = Field(min_length=2, max_length=10)
    label: Identifier | None = None
    # How many of `ids` a result must be linked to; all of them when left out.
    min_shared: int | None = Field(default=None, ge=1)
    limit: int = Field(default=50, ge=1, le=500)


class PathQuery(BaseModel):
    source_id: str
    target_id: str
    k: int = Field(default=1, ge=1, le=5)
    max_length: int = Field(default=6, ge=1, le=10)
