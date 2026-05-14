from fastapi import APIRouter, HTTPException
from schemas.requests import ArticleRequest, ExtractResponse
from db.cypher_validator import validate_cypher
from db.database import execute_cypher
from services.llm_service import LLMService

router = APIRouter()
_llm = LLMService()


@router.get("/")
def read_root():
    return {"status": "Server works!!!"}


@router.post("/extract", response_model=ExtractResponse)
async def extract_graph_data(request: ArticleRequest) -> ExtractResponse:
    try:
        cypher = await _llm.generate_cypher(request.title, request.content)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    validate_cypher(cypher)

    try:
        await execute_cypher(cypher)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ExtractResponse(
        status= "Success! Graph generated and saved in Neo4j",
        executed_code= cypher,
    )
