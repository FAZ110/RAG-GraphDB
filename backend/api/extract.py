from fastapi import APIRouter

from db.database import execute_graph
from db.json_validator import validate_graph_json
from schemas.requests import (
    BulkExtractRequest,
    BulkExtractResponse,
    EdgeResult,
    ExtractResponse,
    NodeResult,
)
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
            raw_json = await llm_service.generate_graph_json(article.title, article.content)
            graph = validate_graph_json(raw_json)
            nodes_dicts = [n.model_dump() for n in graph.nodes]
            edges_dicts = [e.model_dump() for e in graph.edges]
            await execute_graph(nodes_dicts, edges_dicts)

            results.append(
                ExtractResponse(
                    title=article.title,
                    status="ok",
                    nodes=[NodeResult(**n) for n in nodes_dicts],
                    edges=[EdgeResult(**e) for e in edges_dicts],
                    nodes_count=len(graph.nodes),
                    edges_count=len(graph.edges),
                )
            )

        except Exception as e:
            results.append(ExtractResponse(title=article.title, status="error", error=str(e)))

    return BulkExtractResponse(results=results)
