from fastapi import APIRouter, Depends, HTTPException, Response, status

from api.dependencies import CurrentUser, SpaceAccess, space_scope
from db.settings import owns_custom_provider
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
from services.llm_service import CUSTOM_PROVIDER_PREFIX

router = APIRouter(
    prefix="/spaces/{space_id}/articles",
    tags=["articles"],
    dependencies=[Depends(space_scope)],
)


async def _check_provider(user: dict, space: SpaceAccess, provider: str | None) -> None:
    if provider is None:
        return
    if provider.startswith(CUSTOM_PROVIDER_PREFIX):
        if not await owns_custom_provider(
            space.owner(), provider.removeprefix(CUSTOM_PROVIDER_PREFIX)
        ):
            raise HTTPException(status_code=422, detail="Wybrany model nie istnieje")
    elif not user["server_models"]:
        raise HTTPException(
            status_code=403,
            detail="Administrator nie udostępnił Ci modeli serwera, dodaj własny model w ustawieniach",
        )


@router.post("", response_model=JobStarted, status_code=status.HTTP_202_ACCEPTED)
async def upload_articles(space: SpaceAccess, body: ArticlesUpload, user: CurrentUser):
    await _check_provider(user, space, body.provider)
    articles = [a.model_dump() for a in body.articles]
    job_id = await start_extraction(space, articles, body.provider, body.force)
    return JobStarted(job_id=job_id)


@router.post("/retry", response_model=JobStarted, status_code=status.HTTP_202_ACCEPTED)
async def retry_articles(space: SpaceAccess, body: ArticlesRetry, user: CurrentUser):
    await _check_provider(user, space, body.provider)
    job_id = await retry_extraction(space, body.article_ids, body.provider, body.status)
    if job_id is None:
        raise HTTPException(status_code=409, detail="No articles to retry")
    return JobStarted(job_id=job_id)


@router.get("", response_model=list[Article])
async def get_articles(space: SpaceAccess):
    return await list_articles(space)


@router.get("/{article_id}", response_model=ArticleDetail)
async def get_one_article(space: SpaceAccess, article_id: str):
    article = await get_article(space, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_articles(space: SpaceAccess):
    await clear_space(space)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/delete", response_model=ArticlesDeleted)
async def delete_many_articles(space: SpaceAccess, body: ArticlesDelete):
    return await delete_articles(space, body.article_ids)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_one_article(space: SpaceAccess, article_id: str):
    result = await delete_articles(space, [article_id])
    if result["processing"]:
        raise HTTPException(status_code=409, detail="Article is being processed")
    if not result["deleted"]:
        raise HTTPException(status_code=404, detail="Article not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
