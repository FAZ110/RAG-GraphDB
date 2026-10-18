from fastapi import APIRouter, Depends, Response, status

from api.dependencies import existing_space
from db.spaces.articles import list_articles
from db.spaces.spaces import clear_space
from schemas.articles import Article, ArticlesUpload
from schemas.jobs import JobStarted
from services.jobs.extraction import start_extraction

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


@router.get("", response_model=list[Article])
async def get_articles(space_id: str):
    return await list_articles(space_id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_articles(space_id: str):
    await clear_space(space_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
