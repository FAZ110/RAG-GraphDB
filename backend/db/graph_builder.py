import re

from db.cypher_validator import validate_cypher

_SAFE_IDENTIFIER = re.compile(r"^\w+$", re.UNICODE)


def _assert_safe_identifier(value: str, kind: str) -> None:
    if (
        not value
        or not _SAFE_IDENTIFIER.match(value)
        or value[0].isdigit()
        or value != value.upper()
    ):
        raise ValueError(f"Unsafe {kind} '{value}': must be uppercase letters/digits/underscore")


def _safe_var(id_str: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]", "_", id_str)
    return ("n_" + s) if s and s[0].isdigit() else s


def _find_node(nodes: list[dict], node_id: str) -> dict:
    for n in nodes:
        if n["id"] == node_id:
            return n
    raise ValueError(f"Edge references unknown node id: '{node_id}'")


def build_statements(
    nodes: list[dict],
    edges: list[dict],
    embeddings: dict[str, list[float]] | None = None,
) -> list[tuple[str, dict]]:
    statements = []
    for node in nodes:
        _assert_safe_identifier(node["label"], "label")
        embedding = embeddings.get(node["id"]) if embeddings else None
        if embedding is not None:
            cypher = (
                f"MERGE (n:{node['label']}:Entity {{name: $name}}) "
                "SET n += $props, n.embedding = $embedding"
            )
            params = {
                "name": node["properties"].get("name", ""),
                "props": node["properties"],
                "embedding": embedding,
            }
        else:
            cypher = f"MERGE (n:{node['label']}:Entity {{name: $name}}) SET n += $props"
            params = {
                "name": node["properties"].get("name", ""),
                "props": node["properties"],
            }
        validate_cypher(cypher)
        statements.append((cypher, params))
    for edge in edges:
        src = _find_node(nodes, edge["source"])
        tgt = _find_node(nodes, edge["target"])
        _assert_safe_identifier(src["label"], "label")
        _assert_safe_identifier(tgt["label"], "label")
        _assert_safe_identifier(edge["type"], "type")
        cypher = (
            f"MATCH (a:{src['label']} {{name: $src_name}}) "
            f"MATCH (b:{tgt['label']} {{name: $tgt_name}}) "
            f"MERGE (a)-[:{edge['type']}]->(b)"
        )
        validate_cypher(cypher)
        statements.append(
            (cypher, {"src_name": src["properties"]["name"], "tgt_name": tgt["properties"]["name"]})
        )
    return statements
