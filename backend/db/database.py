from db.driver import get_driver, translates_neo4j_errors
from db.graph_queries import (
    NEIGHBOURS_CYPHER,
    ROOT_NODE_CYPHER,
    SEED_EDGES_CYPHER,
    SEED_NODES_CYPHER,
    SIMILAR_NODES_CYPHER,
    edge_from_row,
    node_from_row,
    split_neighbour_rows,
)


@translates_neo4j_errors
async def fetch_seed_graph(limit: int) -> dict:
    """Return the `limit` highest-degree nodes plus the edges between them."""
    async with get_driver().session() as session:
        nodes_res = await session.run(SEED_NODES_CYPHER, {"limit": limit})
        nodes = [node_from_row(r) async for r in nodes_res]

        ids = [n["id"] for n in nodes]
        edges = []
        if ids:
            edges_res = await session.run(SEED_EDGES_CYPHER, {"ids": ids})
            edges = [edge_from_row(r) async for r in edges_res]

        total_res = await session.run("MATCH (n:Entity) RETURN count(n) AS total")
        total_record = await total_res.single()
        total_nodes = total_record["total"] if total_record else 0

    return {"nodes": nodes, "edges": edges, "total_nodes": total_nodes}


@translates_neo4j_errors
async def fetch_node_expansion(node_id: str, limit: int) -> dict:
    """Return a node plus up to `limit` of its neighbours and the connecting edges."""
    async with get_driver().session() as session:
        root_res = await session.run(ROOT_NODE_CYPHER, {"node_id": node_id})
        root_record = await root_res.single()
        if root_record is None:
            return {"root": None, "nodes": [], "edges": []}
        root = node_from_row(root_record)

        neighbours_res = await session.run(NEIGHBOURS_CYPHER, {"node_id": node_id, "limit": limit})
        rows = [r async for r in neighbours_res]

    nodes, edges = split_neighbour_rows(rows)
    return {"root": root, "nodes": nodes, "edges": edges}


@translates_neo4j_errors
async def similar_nodes(vec: list[float], top_k: int) -> list[dict]:
    async with get_driver().session() as session:
        res = await session.run(SIMILAR_NODES_CYPHER, {"top_k": top_k, "vec": vec})
        return [
            {"id": r["id"], "name": r["name"], "label": r["label"], "score": r["score"]}
            async for r in res
        ]


@translates_neo4j_errors
async def reset_graph() -> None:
    async with get_driver().session() as session:
        await session.run("MATCH (n) DETACH DELETE n")
