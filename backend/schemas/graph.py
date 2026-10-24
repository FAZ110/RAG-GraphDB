from typing import Annotated

from pydantic import BaseModel, StringConstraints

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
