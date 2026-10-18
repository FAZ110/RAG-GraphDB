from typing import Any

from pydantic import BaseModel

from core.config import DEFAULT_SPACE


class ArticleRequest(BaseModel):
    url: str = ""
    title: str = ""
    content: str


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
    title: str | None = None
    status: str
    nodes: list[NodeResult] = []
    edges: list[EdgeResult] = []
    nodes_count: int = 0
    edges_count: int = 0
    error: str | None = None


class BulkExtractRequest(BaseModel):
    articles: list[ArticleRequest]
    provider: str = "local"
    space_id: str = DEFAULT_SPACE


class BulkExtractResponse(BaseModel):
    results: list[ExtractResponse]


class JobSubmitResponse(BaseModel):
    job_id: str


class RetryRequest(BaseModel):
    article_ids: list[str] | None = None


class FailedArticle(BaseModel):
    id: str
    title: str
    error: str | None
    started_at: str | None
