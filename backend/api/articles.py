from fastapi import APIRouter, HTTPException

from api.extract import enqueue_job
from db.database import claim_for_retry, failed_articles
from schemas.requests import FailedArticle, JobSubmitResponse, RetryRequest

# shortcut: space_id is not validated, there is only DEFAULT_SPACE; check it exists once spaces land
router = APIRouter(prefix="/spaces/{space_id}/articles")


@router.get("/failed", response_model=list[FailedArticle])
async def list_failed_articles(space_id: str):
    return await failed_articles(space_id)


@router.post("/retry", response_model=JobSubmitResponse)
async def retry_articles(space_id: str, request: RetryRequest) -> JobSubmitResponse:
    claimed = await claim_for_retry(space_id, request.article_ids)
    if not claimed:
        raise HTTPException(status_code=409, detail="No failed articles to retry")
    return await enqueue_job(claimed)
