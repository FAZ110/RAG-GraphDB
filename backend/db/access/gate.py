from collections.abc import Awaitable, Callable, Mapping
from typing import Any

from neo4j import AsyncManagedTransaction, Record, unit_of_work

from db.access.queries import Query
from db.access.runner import Runner
from db.access.scopes import Scope
from db.driver import get_driver

# The one way the API reaches Neo4j: every query goes through a scope, reads in read mode.
_TIMEOUT_SECONDS = 30

type Work[R] = Callable[[Runner], Awaitable[R]]


def _in_transaction[R](scope: Scope, work: Work[R]):
    @unit_of_work(timeout=_TIMEOUT_SECONDS)
    async def run(tx: AsyncManagedTransaction) -> R:
        return await work(Runner(scope, tx))

    return run


async def read[R](scope: Scope, work: Work[R]) -> R:
    """Run `work` in a read transaction; Neo4j refuses any write in it."""
    async with get_driver().session() as session:
        return await session.execute_read(_in_transaction(scope, work))


async def write[R](scope: Scope, work: Work[R]) -> R:
    async with get_driver().session() as session:
        return await session.execute_write(_in_transaction(scope, work))


async def auto[R](scope: Scope, work: Work[R]) -> R:
    """Run `work` on auto-commit transactions, which `CALL { } IN TRANSACTIONS` needs."""
    async with get_driver().session() as session:
        return await work(Runner(scope, session))


async def rows(scope: Scope, query: Query, params: Mapping[str, Any] | None = None) -> list[Record]:
    return await read(scope, lambda db: db.rows(query, params))


async def single(
    scope: Scope, query: Query, params: Mapping[str, Any] | None = None
) -> Record | None:
    return await read(scope, lambda db: db.single(query, params))


async def change(
    scope: Scope, query: Query, params: Mapping[str, Any] | None = None
) -> list[Record]:
    """Run one writing query and return its rows."""
    return await write(scope, lambda db: db.rows(query, params))
