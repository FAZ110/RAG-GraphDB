from fastapi import APIRouter, HTTPException
from schemas.requests import ArticleRequest, ExtractResponse, BulkExtractResponse, BulkExtractRequest
from db.cypher_validator import validate_cypher
from db.database import execute_cypher
from services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()


@router.get("/")
def read_root():
    return {"status": "Server works!!!"}


@router.post("/extract", response_model=BulkExtractResponse)
async def extract_graph_data(request: BulkExtractRequest) -> BulkExtractResponse:

    results = []

    for article in request.articles:
        try:
            cypher = await llm_service.generate_cypher(article.title, article.content)
            validate_cypher(cypher)

            await execute_cypher(cypher)
            results.append(ExtractResponse(title=article.title, status="ok", executed_code=cypher))

        except Exception as e:
            results.append(ExtractResponse(title=article.title, status="error", error=str(e)))

    return BulkExtractResponse(results=results)
