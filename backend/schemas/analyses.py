from datetime import datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from schemas.spaces import LabelCount

AnalysisName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
# Analyses grow to hundreds of entities; this only guards against runaway clients.
_MAX_ENTITIES = 2000
_MAX_ARTICLES = 500


class PlacedEntity(BaseModel):
    id: str
    x: float
    y: float


def _unique(entities: list[PlacedEntity]) -> list[PlacedEntity]:
    if len({e.id for e in entities}) != len(entities):
        raise ValueError("Each entity can stand on the canvas once")
    return entities


Placement = Annotated[list[PlacedEntity], Field(max_length=_MAX_ENTITIES), AfterValidator(_unique)]
ArticleIds = Annotated[list[str], Field(max_length=_MAX_ARTICLES)]
EntityIds = Annotated[list[str], Field(max_length=_MAX_ENTITIES)]


class Viewport(BaseModel):
    x: float
    y: float
    zoom: float = Field(gt=0)


class AnalysisCreate(BaseModel):
    name: AnalysisName = "Nowa analiza"
    entities: Placement = []
    article_ids: ArticleIds = []


class AnalysisUpdate(BaseModel):
    """Only the fields sent are changed."""

    name: AnalysisName | None = None
    viewport: Viewport | None = None


class CanvasChanges(BaseModel):
    """What changed since `revision`, the one the canvas was loaded or last saved at."""

    revision: int = Field(ge=0)
    # Entities added or moved.
    place: Placement = []
    remove: EntityIds = []
    cite: ArticleIds = []
    uncite: ArticleIds = []


class CanvasSaved(BaseModel):
    revision: int
    updated_at: datetime


class AnalysisSummary(BaseModel):
    id: str
    space_id: str
    name: str
    created_at: datetime
    updated_at: datetime
    entity_count: int
    # The most common entity types on the canvas.
    labels: list[LabelCount]


class AnalysisListItem(AnalysisSummary):
    space_name: str


class CanvasEntity(BaseModel):
    id: str
    label: str
    name: str
    degree: int
    properties: dict[str, Any]
    x: float
    y: float


class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: str


class Analysis(AnalysisSummary):
    revision: int
    viewport: Viewport | None
    entities: list[CanvasEntity]
    edges: list[Edge]
    article_ids: list[str]


class AnalysisOrder(BaseModel):
    analysis_ids: list[str] = Field(max_length=_MAX_ENTITIES)
