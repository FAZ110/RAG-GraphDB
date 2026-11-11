import uuid
from collections import Counter
from collections.abc import Mapping
from typing import Any

from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SpaceScope, UserScope
from db.driver import translates_neo4j_errors
from db.errors import RevisionConflictError
from db.graph.reads import _edge, _node

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


async def _apply(db: Runner, analysis_id: str, changes: dict) -> None:
    """Changes to a canvas: entities placed (added or moved) or removed, articles cited or not."""
    params = {"analysis_id": analysis_id}
    if changes.get("remove"):
        await db.run(_QUERIES["remove_entities"], {**params, "ids": changes["remove"]})
    if changes.get("place"):
        await db.run(_QUERIES["place_entities"], {**params, "entities": changes["place"]})
    if changes.get("uncite"):
        await db.run(_QUERIES["uncite_articles"], {**params, "ids": changes["uncite"]})
    if changes.get("cite"):
        await db.run(_QUERIES["cite_articles"], {**params, "article_ids": changes["cite"]})


@translates_neo4j_errors
async def list_analyses(scope: SpaceScope) -> list[dict]:
    return [_summary(r) for r in await gate.rows(scope, _QUERIES["list_analyses"])]


@translates_neo4j_errors
async def list_all_analyses(scope: UserScope, limit: int) -> list[dict]:
    """The most recently changed analyses across every space of the owner."""
    rows = await gate.rows(scope, _QUERIES["list_all_analyses"], {"limit": limit})
    return [_summary(r) for r in rows]


@translates_neo4j_errors
async def get_analysis(scope: SpaceScope, analysis_id: str) -> dict | None:
    """The analysis with its entities where they stand on the canvas and the edges among them."""
    params = {"analysis_id": analysis_id}

    async def work(db: Runner) -> dict | None:
        row = await db.single(_QUERIES["analysis"], params)
        if row is None:
            return None
        rows = await db.rows(_QUERIES["analysis_entities"], params)
        entities = [{**_node(r), "x": r["x"], "y": r["y"]} for r in rows]
        edges = [_edge(r) for r in await db.rows(_QUERIES["analysis_edges"], params)]
        return {
            **_summary(row),
            "revision": row["revision"],
            "viewport": _viewport(row),
            "article_ids": row["article_ids"],
            "entities": entities,
            "edges": edges,
        }

    return await gate.read(scope, work)


@translates_neo4j_errors
async def create_analysis(
    scope: SpaceScope, name: str, entities: list[dict], article_ids: list[str]
) -> dict:
    analysis_id = str(uuid.uuid4())

    async def work(db: Runner) -> None:
        await db.run(_QUERIES["create_analysis"], {"analysis_id": analysis_id, "name": name})
        await _apply(db, analysis_id, {"place": entities, "cite": article_ids})

    await gate.write(scope, work)
    return await get_analysis(scope, analysis_id)


@translates_neo4j_errors
async def update_analysis(scope: SpaceScope, analysis_id: str, changes: dict) -> bool:
    """Rename it or remember its viewport; the canvas revision stays."""
    params = {"analysis_id": analysis_id, "changes": changes}
    return bool(await gate.change(scope, _QUERIES["update_analysis"], params))


@translates_neo4j_errors
async def change_canvas(
    scope: SpaceScope, analysis_id: str, revision: int, changes: dict
) -> dict | None:
    """Apply what changed on the canvas since `revision`. None if there is no such analysis;
    raises RevisionConflictError when it was saved elsewhere since `revision`."""

    async def work(db: Runner) -> dict | None:
        params = {"analysis_id": analysis_id, "revision": revision}
        claim = await db.single(_QUERIES["claim_revision"], params)
        if claim is None:
            return None
        if not claim["current"]:
            raise RevisionConflictError(f"Analysis is at revision {claim['revision']}")
        await _apply(db, analysis_id, changes)
        return {"revision": claim["revision"], "updated_at": claim["updated_at"].to_native()}

    return await gate.write(scope, work)


@translates_neo4j_errors
async def reorder_analyses(scope: UserScope, analysis_ids: list[str]) -> None:
    """Analyses in the order they were arranged in, across the owner's spaces;
    unknown ids and other owners' analyses are skipped."""
    await gate.change(scope, _QUERIES["reorder_analyses"], {"analysis_ids": analysis_ids})


@translates_neo4j_errors
async def delete_analysis(scope: SpaceScope, analysis_id: str) -> bool:
    rows = await gate.change(scope, _QUERIES["delete_analysis"], {"analysis_id": analysis_id})
    return rows[0]["deleted"] > 0
