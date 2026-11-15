from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from neo4j.exceptions import ConstraintError
from redis.exceptions import LockError

from core.config import REDIS_URL
from db.access import gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SpaceScope
from db.driver import translates_neo4j_errors
from db.errors import EntityKeyTakenError, GraphDatabaseError
from db.graph.reads import _edge, _node
from db.graph.writer import _RESERVED_PROPS, GRAPH_WRITE_LOCK, _assert_safe_identifier
from services.embedding_service import embedding_text, get_embedding_service

_QUERIES = load_queries(__file__)
# Extraction holds the lock for one article's write; edits wait a little less than a request.
_LOCK_TIMEOUT = 30
_LOCK_WAIT = 20
_MERGE_SKIP = (_RESERVED_PROPS - {"description", "type"}) | {"name", "manual"}


@asynccontextmanager
async def _locked(space_id: str) -> AsyncIterator[None]:
    """The space's graph write lock, shared with the extraction workers."""
    r = aioredis.from_url(REDIS_URL)
    lock = r.lock(
        GRAPH_WRITE_LOCK.format(space_id=space_id),
        timeout=_LOCK_TIMEOUT,
        blocking_timeout=_LOCK_WAIT,
    )
    try:
        if not await lock.acquire():
            raise GraphDatabaseError(
                "Graf jest właśnie zapisywany przez ekstrakcję, spróbuj za chwilę", 503
            )
        try:
            yield
        finally:
            try:
                await lock.release()
            except LockError:
                pass  # expired while the edit ran; nothing left to release
    finally:
        await r.aclose()


async def _write[R](scope: SpaceScope, work: Callable[[Runner], Awaitable[R]]) -> R:
    async with _locked(scope.space_id):
        try:
            return await gate.write(scope, work)
        except ConstraintError as e:
            raise EntityKeyTakenError(str(e.message)) from e


def _embed(label: str, name: str, description: str | None) -> list[float]:
    return get_embedding_service().embed(embedding_text(label, name, description))


def _clean_aliases(aliases: list[str], name: str) -> list[str]:
    return [a for a in dict.fromkeys(a.strip() for a in aliases) if a and a != name]


async def _single(db: Runner, query: str, params: dict) -> dict | None:
    row = await db.single(_QUERIES[query], params)
    return dict(row) if row else None


@translates_neo4j_errors
async def create_entity(
    scope: SpaceScope,
    label: str,
    name: str,
    description: str | None,
    type_: str | None,
    aliases: list[str],
) -> dict:
    _assert_safe_identifier(label, "label")
    params = {
        "label": label,
        "name": name,
        "description": description,
        "type": type_,
        "aliases": _clean_aliases(aliases, name),
        "embedding": _embed(label, name, description),
    }

    async def work(db: Runner) -> dict:
        return await _single(db, "create_entity", params)

    return _node(await _write(scope, work))


@translates_neo4j_errors
async def update_entity(scope: SpaceScope, node_id: str, changes: dict) -> dict | None:
    """Apply the given fields; a renamed entity keeps its old name as an alias.
    None if the entity is not in the space."""
    if "label" in changes:
        _assert_safe_identifier(changes["label"], "label")

    async def work(db: Runner) -> dict | None:
        row = await _single(db, "entity", {"node_id": node_id})
        if row is None:
            return None
        props = row["props"]
        label = changes.get("label", row["label"])
        name = changes.get("name", props["name"])
        description = changes.get("description", props.get("description"))
        aliases = changes.get("aliases", props.get("aliases") or [])
        if name != props["name"]:
            aliases = [*aliases, props["name"]]
        embedding = props.get("embedding")
        if (label, name, description) != (row["label"], props["name"], props.get("description")):
            embedding = _embed(label, name, description)
        return await _single(
            db,
            "update_entity",
            {
                "node_id": node_id,
                "old_label": row["label"],
                "label": label,
                "name": name,
                "description": description,
                "type": changes.get("type", props.get("type")),
                "aliases": _clean_aliases(aliases, name),
                "embedding": embedding,
            },
        )

    row = await _write(scope, work)
    return _node(row) if row else None


@translates_neo4j_errors
async def delete_entity(scope: SpaceScope, node_id: str) -> bool:
    async def work(db: Runner) -> bool:
        row = await _single(db, "delete_entity", {"node_id": node_id})
        return row["deleted"] > 0

    return await _write(scope, work)


@translates_neo4j_errors
async def merge_entities(scope: SpaceScope, keep_id: str, dup_id: str) -> bool:
    """Fold `dup` into `keep`: its mentions, relationships, name, aliases and places in
    analyses move over and it is deleted. False if either entity is not in the space."""
    if keep_id == dup_id:
        raise ValueError("Nie można scalić węzła z samym sobą")
    params = {"keep_id": keep_id, "dup_id": dup_id}

    async def work(db: Runner) -> bool:
        keep = await _single(db, "entity", {"node_id": keep_id})
        dup = await _single(db, "entity", {"node_id": dup_id})
        if keep is None or dup is None:
            return False
        kp, dp = keep["props"], dup["props"]
        aliases = [*(kp.get("aliases") or []), dp["name"], *(dp.get("aliases") or [])]
        # Only fills what `keep` lacks; its name and label stay.
        props = {k: v for k, v in dp.items() if k not in _MERGE_SKIP and kp.get(k) is None}
        if "description" in props:
            props["embedding"] = _embed(keep["label"], kp["name"], props["description"])
        for name in ("merge_mentions", "merge_outgoing", "merge_incoming", "merge_analyses"):
            await db.run(_QUERIES[name], params)
        await db.run(
            _QUERIES["merge_finish"],
            {**params, "props": props, "aliases": _clean_aliases(aliases, kp["name"])},
        )
        return True

    return await _write(scope, work)


@translates_neo4j_errors
async def create_relationship(
    scope: SpaceScope, source_id: str, target_id: str, type_: str
) -> dict | None:
    """None if either entity is not in the space."""
    _assert_safe_identifier(type_, "type")
    if source_id == target_id:
        raise ValueError("Powiązanie musi łączyć dwa różne węzły")
    params = {"source_id": source_id, "target_id": target_id, "type": type_}

    async def work(db: Runner) -> dict | None:
        return await _single(db, "create_relationship", params)

    row = await _write(scope, work)
    return _edge(row) if row else None


@translates_neo4j_errors
async def update_relationship(scope: SpaceScope, edge_id: str, type_: str) -> dict | None:
    """Change the type; the relationship gets a new id. None if it is not in the space."""
    _assert_safe_identifier(type_, "type")
    params = {"edge_id": edge_id, "type": type_}

    async def work(db: Runner) -> dict | None:
        return await _single(db, "update_relationship", params)

    row = await _write(scope, work)
    return _edge(row) if row else None


@translates_neo4j_errors
async def delete_relationship(scope: SpaceScope, edge_id: str) -> bool:
    async def work(db: Runner) -> bool:
        row = await _single(db, "delete_relationship", {"edge_id": edge_id})
        return row["deleted"] > 0

    return await _write(scope, work)


@translates_neo4j_errors
async def reject_suggestion(scope: SpaceScope, suggestion_id: str) -> bool:
    """Mark a suggested pair as different entities, so it is not suggested again.
    No graph lock: suggestions are not part of the graph."""
    rows = await gate.change(scope, _QUERIES["reject_suggestion"], {"suggestion_id": suggestion_id})
    return rows[0]["rejected"] > 0
