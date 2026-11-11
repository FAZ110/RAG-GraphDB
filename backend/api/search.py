from fastapi import APIRouter, Query

from api.dependencies import Owner
from db.graph.reads import search_all_spaces
from db.spaces.articles import search_articles
from schemas.search import SearchResults
from services.embedding_service import get_embedding_service

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResults)
async def search_everywhere(
    owner: Owner, q: str = Query(min_length=2), limit: int = Query(6, ge=1, le=20)
):
    """Entities by meaning and articles by title or address, across the user's spaces."""
    entities = await search_all_spaces(owner, get_embedding_service().embed(q), limit)
    articles = await search_articles(owner, q, limit)
    return SearchResults(entities=entities, articles=articles)
