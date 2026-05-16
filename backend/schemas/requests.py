from pydantic import BaseModel


class ArticleRequest(BaseModel):
    url: str = ""
    title: str = ""
    content: str


class ExtractResponse(BaseModel):
    title: str | None = None
    status: str
    executed_code: str | None = None
    error: str | None = None


class BulkExtractRequest(BaseModel):
    articles: list[ArticleRequest]


class BulkExtractResponse(BaseModel):
    results: list[ExtractResponse]