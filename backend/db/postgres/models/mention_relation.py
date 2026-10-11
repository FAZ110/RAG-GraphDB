import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.postgres.models.base import Base


class MentionRelation(Base):
    __tablename__ = "mention_relations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    article_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("articles.id", ondelete="CASCADE"), index=True
    )
    src_mention_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mentions.id", ondelete="CASCADE"), index=True
    )
    dst_mention_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mentions.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(Text)
