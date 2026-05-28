from typing import Any

from pydantic import BaseModel


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


class BulkExtractResponse(BaseModel):
    results: list[ExtractResponse]


class JobSubmitResponse(BaseModel):
    job_id: str
