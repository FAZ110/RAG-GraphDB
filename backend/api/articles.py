from fastapi import APIRouter, Depends, HTTPException, Response, status

from api.dependencies import existing_space
from db.spaces.articles import delete_articles, get_article, list_articles
from db.spaces.spaces import clear_space
from schemas.articles import (
    Article,
    ArticleDetail,
    ArticlesDelete,
    ArticlesDeleted,
    ArticlesRetry,
    ArticlesUpload,
)
from schemas.jobs import JobStarted
from services.jobs.extraction import retry_extraction, start_extraction

router = APIRouter(
    prefix="/spaces/{space_id}/articles",
    tags=["articles"],
    dependencies=[Depends(existing_space)],
)


@router.post("", response_model=JobStarted, status_code=status.HTTP_202_ACCEPTED)
async def upload_articles(space_id: str, body: ArticlesUpload):
    articles = [a.model_dump() for a in body.articles]
    job_id = await start_extraction(space_id, articles, body.provider, body.force)
    return JobStarted(job_id=job_id)


@router.post("/retry", response_model=JobStarted, status_code=status.HTTP_202_ACCEPTED)
async def retry_articles(space_id: str, body: ArticlesRetry):
    job_id = await retry_extraction(space_id, body.article_ids, body.provider)
    if job_id is None:
        raise HTTPException(status_code=409, detail="No failed articles to retry")
    return JobStarted(job_id=job_id)


@router.get("", response_model=list[Article])
async def get_articles(space_id: str):
    return await list_articles(space_id)


@router.get("/{article_id}", response_model=ArticleDetail)
async def get_one_article(space_id: str, article_id: str):
    article = await get_article(space_id, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_articles(space_id: str):
    await clear_space(space_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/delete", response_model=ArticlesDeleted)
async def delete_many_articles(space_id: str, body: ArticlesDelete):
    return await delete_articles(space_id, body.article_ids)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_one_article(space_id: str, article_id: str):
    result = await delete_articles(space_id, [article_id])
    if result["processing"]:
        raise HTTPException(status_code=409, detail="Article is being processed")
    if not result["deleted"]:
        raise HTTPException(status_code=404, detail="Article not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
