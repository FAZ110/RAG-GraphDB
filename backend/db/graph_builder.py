import re

def _safe_var(id_str: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9]', '_', id_str)
    return ("n_" + s) if s and s[0].isdigit() else s

def _find_node(nodes: list[dict], node_id: str) -> dict:
    for n in nodes:
        if n["id"] == node_id:
            return n
    raise ValueError(f"Edge references unknown node id: '{node_id}'")

def build_statements(nodes: list[dict], edges: list[dict]) -> list[tuple[str, dict]]:
    statements = []
    for node in nodes:
        cypher = f"MERGE (n:{node['label']} {{name: $name}}) SET n += $props"
        statements.append((cypher, {"name": node["properties"].get("name", ""), "props": node["properties"]}))
    for edge in edges:
        src = _find_node(nodes, edge["source"])
        tgt = _find_node(nodes, edge["target"])
        cypher = (
            f"MATCH (a:{src['label']} {{name: $src_name}}) "
            f"MATCH (b:{tgt['label']} {{name: $tgt_name}}) "
            f"MERGE (a)-[:{edge['type']}]->(b)"
        )
        statements.append((cypher, {"src_name": src["properties"]["name"], "tgt_name": tgt["properties"]["name"]}))
    return statements