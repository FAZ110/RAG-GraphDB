from typing import Any

from pydantic import BaseModel


class JobStarted(BaseModel):
    job_id: str


class NodeResult(BaseModel):
    id: str
    label: str
    properties: dict[str, Any]


class EdgeResult(BaseModel):
    source: str
    target: str
    type: str
    properties: dict[str, Any] = {}


class ArticleResult(BaseModel):
    """Payload of each `result` event in a job's SSE stream."""

    article_id: str | None = None
    title: str | None = None
    status: str
    # The article's text was already processed, so extraction was skipped.
    unchanged: bool = False
    nodes: list[NodeResult] = []
    edges: list[EdgeResult] = []
    nodes_count: int = 0
    edges_count: int = 0
    error: str | None = None
