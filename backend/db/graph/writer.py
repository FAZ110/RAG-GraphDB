import re

from db.query_loader import load_queries

_QUERIES = load_queries(__file__)

_SAFE_IDENTIFIER = re.compile(r"^\w+$", re.UNICODE)
# The LLM may return properties with these names; they must not overwrite the graph's own.
_RESERVED_PROPS = {"id", "space_id", "label", "embedding", "aliases", "created_at"}


def _assert_safe_identifier(value: str, kind: str) -> None:
    if (
        not value
        or not _SAFE_IDENTIFIER.match(value)
        or value[0].isdigit()
        or value != value.upper()
    ):
        raise ValueError(f"Unsafe {kind} '{value}': must be uppercase letters/digits/underscore")


def _find_node(nodes: list[dict], node_id: str) -> dict:
    for n in nodes:
        if n["id"] == node_id:
            return n
    raise ValueError(f"Edge references unknown node id: '{node_id}'")


def build_statements(
    nodes: list[dict],
    edges: list[dict],
    space_id: str,
    article_id: str,
    embeddings: dict[str, list[float]] | None = None,
) -> list[tuple[str, dict]]:
    """Queries that write an article's entities and relationships into its space.

    Entities merge on (space_id, label, name), the `entity_key` constraint. Each
    relationship records the articles backing it in `article_ids`, which is what
    `release_article` uses to take back a single article's share.
    """
    statements = []
    for node in nodes:
        _assert_safe_identifier(node["label"], "label")
        props = {k: v for k, v in node["properties"].items() if k not in _RESERVED_PROPS}
        statements.append(
            (
                _QUERIES["merge_entity"],
                {
                    "space_id": space_id,
                    "article_id": article_id,
                    "label": node["label"],
                    "name": node["properties"].get("name", ""),
                    "props": props,
                    "aliases": node.get("aliases", []),
                    "embedding": embeddings.get(node["id"]) if embeddings else None,
                },
            )
        )
    for edge in edges:
        _assert_safe_identifier(edge["type"], "type")
        src = _find_node(nodes, edge["source"])
        tgt = _find_node(nodes, edge["target"])
        statements.append(
            (
                _QUERIES["merge_relationship"],
                {
                    "space_id": space_id,
                    "article_id": article_id,
                    "type": edge["type"],
                    "source_label": src["label"],
                    "source_name": src["properties"]["name"],
                    "target_label": tgt["label"],
                    "target_name": tgt["properties"]["name"],
                },
            )
        )
    return statements
