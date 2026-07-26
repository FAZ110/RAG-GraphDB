from collections.abc import Iterable, Mapping
from typing import Any

_LABEL_EXPR = "[l IN labels({var}) WHERE l <> 'Entity'][0]"

SEED_NODES_CYPHER = f"""
MATCH (n:Entity)
WITH n, COUNT {{ (n)--() }} AS degree
ORDER BY degree DESC
LIMIT $limit
RETURN elementId(n) AS id,
       {_LABEL_EXPR.format(var="n")} AS label,
       properties(n) AS props,
       degree
"""

SEED_EDGES_CYPHER = """
MATCH (n)-[r]->(m)
WHERE elementId(n) IN $ids AND elementId(m) IN $ids
RETURN elementId(r) AS edge_id,
       elementId(n) AS edge_source,
       elementId(m) AS edge_target,
       type(r) AS edge_type
"""

ROOT_NODE_CYPHER = f"""
MATCH (n) WHERE elementId(n) = $node_id
RETURN elementId(n) AS id,
       {_LABEL_EXPR.format(var="n")} AS label,
       properties(n) AS props,
       COUNT {{ (n)--() }} AS degree
"""

NEIGHBOURS_CYPHER = f"""
MATCH (n) WHERE elementId(n) = $node_id
MATCH (n)-[r]-(m)
WITH m, r, COUNT {{ (m)--() }} AS degree
ORDER BY degree DESC
LIMIT $limit
RETURN elementId(m) AS id,
       {_LABEL_EXPR.format(var="m")} AS label,
       properties(m) AS props,
       degree,
       elementId(r) AS edge_id,
       type(r) AS edge_type,
       elementId(startNode(r)) AS edge_source,
       elementId(endNode(r)) AS edge_target
"""

_DEFAULT_LABEL = "ENTITY"


def node_from_row(row: Mapping[str, Any]) -> dict:
    """Map a node-shaped result row to the wire DTO, dropping the embedding vector."""
    props = {k: v for k, v in dict(row["props"]).items() if k != "embedding"}
    return {
        "id": row["id"],
        "label": row["label"] or _DEFAULT_LABEL,
        "name": props.get("name", ""),
        "degree": row["degree"],
        "properties": props,
    }


def edge_from_row(row: Mapping[str, Any]) -> dict:
    """Map an edge-shaped result row to the wire DTO."""
    return {
        "id": row["edge_id"],
        "source": row["edge_source"],
        "target": row["edge_target"],
        "type": row["edge_type"],
    }


def split_neighbour_rows(
    rows: Iterable[Mapping[str, Any]],
) -> tuple[list[dict], list[dict]]:
    """Split combined neighbour rows into deduplicated node and edge lists.

    A neighbour connected by more than one relationship yields one row per
    relationship, so the node side must be deduplicated by id.
    """
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    for row in rows:
        node = node_from_row(row)
        nodes.setdefault(node["id"], node)
        edge = edge_from_row(row)
        edges.setdefault(edge["id"], edge)
    return list(nodes.values()), list(edges.values())
