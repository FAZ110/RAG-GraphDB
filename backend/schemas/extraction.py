from typing import Annotated, Any

from pydantic import BaseModel, StringConstraints


class ArticleRequest(BaseModel):
    url: str = ""
    title: str = ""
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class NodeResult(BaseModel):
    id: str
    label: str
    properties: dict[str, Any]


class EdgeResult(BaseModel):
    source: str
    target: str
    type: str
    properties: dict[str, Any] = {}


class ExtractResponse(BaseModel):
    article_id: str | None = None
    title: str | None = None
    status: str
    unchanged: bool = False
    nodes: list[NodeResult] = []
    edges: list[EdgeResult] = []
    nodes_count: int = 0
    edges_count: int = 0
    error: str | None = None


class BulkExtractRequest(BaseModel):
    space_id: str
    articles: list[ArticleRequest]
    provider: str = "local"
    # Re-extract articles even when their text is unchanged since the last run.
    force: bool = False


class BulkExtractResponse(BaseModel):
    results: list[ExtractResponse]


class JobSubmitResponse(BaseModel):
    job_id: str
