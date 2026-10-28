import uuid
from collections import Counter
from collections.abc import Mapping
from typing import Any

from neo4j import AsyncManagedTransaction

from db.driver import get_driver, translates_neo4j_errors
from db.errors import RevisionConflictError
from db.graph.reads import _edge, _node
from db.query_loader import load_queries

_QUERIES = load_queries(__file__)
# The entity types named on an analysis card.
_TOP_LABELS = 4


def _summary(row: Mapping[str, Any]) -> dict:
    summary = {
        "id": row["id"],
        "space_id": row["space_id"],
        "name": row["name"],
        "created_at": row["created_at"].to_native(),
        "updated_at": row["updated_at"].to_native(),
        "entity_count": len(row["labels"]),
        "labels": [
            {"label": label, "count": count}
            for label, count in Counter(row["labels"]).most_common(_TOP_LABELS)
        ],
    }
    if "space_name" in row.keys():
        summary["space_name"] = row["space_name"]
    return summary


def _viewport(row: Mapping[str, Any]) -> dict | None:
    if row["viewport_zoom"] is None:
        return None
    return {"x": row["viewport_x"], "y": row["viewport_y"], "zoom": row["viewport_zoom"]}


async def _run(tx: AsyncManagedTransaction, query: str, params: dict) -> None:
    await (await tx.run(_QUERIES[query], params)).consume()


async def _apply(tx: AsyncManagedTransaction, params: dict, changes: dict) -> None:
    """Changes to a canvas: entities placed (added or moved) or removed, articles cited or not."""
    if changes.get("remove"):
        await _run(tx, "remove_entities", {**params, "ids": changes["remove"]})
    if changes.get("place"):
        await _run(tx, "place_entities", {**params, "entities": changes["place"]})
    if changes.get("uncite"):
        await _run(tx, "uncite_articles", {**params, "ids": changes["uncite"]})
    if changes.get("cite"):
        await _run(tx, "cite_articles", {**params, "article_ids": changes["cite"]})


@translates_neo4j_errors
async def list_analyses(space_id: str) -> list[dict]:
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["list_analyses"], {"space_id": space_id})
        return [_summary(r) async for r in res]


@translates_neo4j_errors
async def list_all_analyses(limit: int) -> list[dict]:
    """The most recently changed analyses across every space."""
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["list_all_analyses"], {"limit": limit})
        return [_summary(r) async for r in res]


@translates_neo4j_errors
async def get_analysis(space_id: str, analysis_id: str) -> dict | None:
    """The analysis with its entities where they stand on the canvas and the edges among them."""
    params = {"space_id": space_id, "analysis_id": analysis_id}
    async with get_driver().session() as session:
        row = await (await session.run(_QUERIES["analysis"], params)).single()
        if row is None:
            return None
        res = await session.run(_QUERIES["analysis_entities"], params)
        entities = [{**_node(r), "x": r["x"], "y": r["y"]} async for r in res]
        res = await session.run(_QUERIES["analysis_edges"], params)
        edges = [_edge(r) async for r in res]
    return {
        **_summary(row),
        "revision": row["revision"],
        "viewport": _viewport(row),
        "article_ids": row["article_ids"],
        "entities": entities,
        "edges": edges,
    }


@translates_neo4j_errors
async def create_analysis(
    space_id: str, name: str, entities: list[dict], article_ids: list[str]
) -> dict:
    params = {"space_id": space_id, "analysis_id": str(uuid.uuid4())}

    async def work(tx: AsyncManagedTransaction) -> None:
        await _run(tx, "create_analysis", {**params, "name": name})
        await _apply(tx, params, {"place": entities, "cite": article_ids})

    async with get_driver().session() as session:
        await session.execute_write(work)
    return await get_analysis(space_id, params["analysis_id"])


@translates_neo4j_errors
async def update_analysis(space_id: str, analysis_id: str, changes: dict) -> bool:
    """Rename it or remember its viewport; the canvas revision stays."""
    params = {"space_id": space_id, "analysis_id": analysis_id, "changes": changes}
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["update_analysis"], params)
        return await res.single() is not None


@translates_neo4j_errors
async def change_canvas(
    space_id: str, analysis_id: str, revision: int, changes: dict
) -> dict | None:
    """Apply what changed on the canvas since `revision`. None if there is no such analysis;
    raises RevisionConflictError when it was saved elsewhere since `revision`."""
    params = {"space_id": space_id, "analysis_id": analysis_id}

    async def work(tx: AsyncManagedTransaction) -> dict | None:
        res = await tx.run(_QUERIES["claim_revision"], {**params, "revision": revision})
        claim = await res.single()
        if claim is None:
            return None
        if not claim["current"]:
            raise RevisionConflictError(f"Analysis is at revision {claim['revision']}")
        await _apply(tx, params, changes)
        return {"revision": claim["revision"], "updated_at": claim["updated_at"].to_native()}

    async with get_driver().session() as session:
        return await session.execute_write(work)


@translates_neo4j_errors
async def reorder_analyses(analysis_ids: list[str]) -> None:
    """Analyses in the order they were arranged in, across spaces; unknown ids are skipped."""
    async with get_driver().session() as session:
        params = {"analysis_ids": analysis_ids}
        await (await session.run(_QUERIES["reorder_analyses"], params)).consume()


@translates_neo4j_errors
async def delete_analysis(space_id: str, analysis_id: str) -> bool:
    params = {"space_id": space_id, "analysis_id": analysis_id}
    async with get_driver().session() as session:
        row = await (await session.run(_QUERIES["delete_analysis"], params)).single()
        return row["deleted"] > 0
