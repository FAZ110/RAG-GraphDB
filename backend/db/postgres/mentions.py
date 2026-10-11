import uuid

from sqlalchemy import delete

from db.json_validator import EdgeSchema, NodeSchema
from db.postgres.models import Mention, MentionRelation
from db.postgres.session import SessionLocal


def save_mentions(
    article_id: uuid.UUID,
    nodes: list[NodeSchema],
    edges: list[EdgeSchema],
    embeddings: list[list[float]],
) -> None:
    with SessionLocal.begin() as session:
        session.execute(delete(MentionRelation).where(MentionRelation.article_id == article_id))
        session.execute(delete(Mention).where(Mention.article_id == article_id))

        mentions_by_node_id = {
            node.id: Mention(
                article_id=article_id,
                name=node.properties["name"],
                label=node.label,
                embedding=embedding,
            )
            for node, embedding in zip(nodes, embeddings, strict=True)
        }
        session.add_all(mentions_by_node_id.values())
        session.flush()

        session.add_all(
            MentionRelation(
                article_id=article_id,
                src_mention_id=mentions_by_node_id[edge.source].id,
                dst_mention_id=mentions_by_node_id[edge.target].id,
                type=edge.type,
            )
            for edge in edges
        )
