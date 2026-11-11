from collections.abc import Iterable, Mapping
from typing import Any

from neo4j import Record
from neo4j.graph import Node

from db.access.queries import Query
from db.access.scopes import Scope, SpaceScope

# Deep enough for a row of nodes with their relationships; property lists stop it sooner.
_MAX_DEPTH = 4


class ScopeError(RuntimeError):
    """A query run outside its scope, or data of another space coming back."""


def bind(scope: Scope, query: Query, params: Mapping[str, Any] | None) -> dict[str, Any]:
    """The query's parameters with the scope's own, which only the scope may set."""
    if query.kind not in scope.kinds:
        raise ScopeError(f"{type(scope).__name__} cannot run {query.kind} query '{query.name}'")
    given = dict(params or {})
    injected = scope.params()
    if taken := given.keys() & injected.keys():
        raise ScopeError(f"Query '{query.name}' got {sorted(taken)}, which the scope sets")
    return given | injected


def _space_ids(value: Any, depth: int = 0) -> Iterable[Any]:
    if depth > _MAX_DEPTH:
        return
    if isinstance(value, Record):
        value = dict(value)
    if isinstance(value, Node | Mapping):
        if "space_id" in value.keys():
            yield value["space_id"]
        if isinstance(value, Mapping):
            for v in value.values():
                yield from _space_ids(v, depth + 1)
    elif isinstance(value, list) and value and isinstance(value[0], Mapping | Node | list):
        for v in value:
            yield from _space_ids(v, depth + 1)


def checked_rows(scope: Scope, query: Query, rows: list[Record]) -> list[Record]:
    """Refuse rows of a space query carrying another space's data, a last line behind
    the queries' own filters."""
    if query.kind == "space" and isinstance(scope, SpaceScope):
        for row in rows:
            for space_id in _space_ids(row):
                if space_id is not None and space_id != scope.space_id:
                    raise ScopeError(f"Query '{query.name}' returned another space's data")
    return rows
