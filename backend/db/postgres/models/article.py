import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from db.postgres.models.base import Base


class ArticleStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    OK = "ok"
    ERROR = "error"


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    # Not unique on purpose: duplicate detection on import is a separate feature.
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[ArticleStatus] = mapped_column(
        Enum(
            ArticleStatus,
            native_enum=False,
            create_constraint=True,
            name="article_status",
            length=16,
            values_callable=lambda statuses: [s.value for s in statuses],
            validate_strings=True,
        ),
        default=ArticleStatus.PENDING,
        index=True,
    )
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
