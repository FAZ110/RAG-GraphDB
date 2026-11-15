from collections.abc import Mapping
from typing import Any

from neo4j import AsyncManagedTransaction, AsyncSession, ManagedTransaction, Record, Session

from db.access.guard import bind, checked_rows
from db.access.queries import Query
from db.access.scopes import Scope


class Runner:
    """Runs named queries within one scope, on a transaction or an auto-commit session."""

    def __init__(self, scope: Scope, target: AsyncManagedTransaction | AsyncSession) -> None:
        self.scope = scope
        self._target = target

    async def rows(self, query: Query, params: Mapping[str, Any] | None = None) -> list[Record]:
        res = await self._target.run(query.text, bind(self.scope, query, params))
        return checked_rows(self.scope, query, [r async for r in res])

    async def single(
        self, query: Query, params: Mapping[str, Any] | None = None, strict: bool = False
    ) -> Record | None:
        rows = await self.rows(query, params)
        if strict and not rows:
            raise LookupError(f"Query '{query.name}' returned no row")
        return rows[0] if rows else None

    async def run(self, query: Query, params: Mapping[str, Any] | None = None) -> None:
        await (await self._target.run(query.text, bind(self.scope, query, params))).consume()


class SyncRunner:
    """Runner for the Celery workers, which have no event loop."""

    def __init__(self, scope: Scope, target: ManagedTransaction | Session) -> None:
        self.scope = scope
        self._target = target

    def rows(self, query: Query, params: Mapping[str, Any] | None = None) -> list[Record]:
        res = self._target.run(query.text, bind(self.scope, query, params))
        return checked_rows(self.scope, query, list(res))

    def single(
        self, query: Query, params: Mapping[str, Any] | None = None, strict: bool = False
    ) -> Record | None:
        rows = self.rows(query, params)
        if strict and not rows:
            raise LookupError(f"Query '{query.name}' returned no row")
        return rows[0] if rows else None

    def run(self, query: Query, params: Mapping[str, Any] | None = None) -> None:
        self._target.run(query.text, bind(self.scope, query, params)).consume()
