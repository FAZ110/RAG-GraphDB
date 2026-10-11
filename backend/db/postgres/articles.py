import hashlib
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres.models import Article, ArticleStatus
from db.postgres.session import SessionLocal
from schemas.requests import ArticleRequest


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


async def create_articles(session: AsyncSession, requests: list[ArticleRequest]) -> list[uuid.UUID]:
    articles = [
        Article(
            title=r.title,
            url=r.url or None,
            content=r.content,
            content_hash=content_hash(r.content),
            status=ArticleStatus.PENDING,
        )
        for r in requests
    ]
    session.add_all(articles)
    await session.commit()
    return [a.id for a in articles]


def set_article_status(
    article_id: uuid.UUID, status: ArticleStatus, error: str | None = None
) -> None:
    with SessionLocal.begin() as session:
        article = session.get(Article, article_id)
        if article is None:
            return
        article.status = status
        article.error = error
