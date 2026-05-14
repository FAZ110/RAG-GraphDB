from pydantic import BaseModel


class ArticleRequest(BaseModel):
    url: str = ""
    title: str = ""
    content: str


class ExtractResponse(BaseModel):
    status: str
    executed_code: str | None = None
    error: str | None = None
