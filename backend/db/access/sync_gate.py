from collections.abc import Callable, Mapping
from typing import Any

from neo4j import ManagedTransaction, Record, unit_of_work

from db.access.queries import Query
from db.access.runner import SyncRunner
from db.access.scopes import Scope
from db.driver import get_sync_driver

# The Celery workers' way to Neo4j, the same rules as the API's gate.
_TIMEOUT_SECONDS = 60

type Work[R] = Callable[[SyncRunner], R]


def _in_transaction[R](scope: Scope, work: Work[R]):
    @unit_of_work(timeout=_TIMEOUT_SECONDS)
    def run(tx: ManagedTransaction) -> R:
        return work(SyncRunner(scope, tx))

    return run


def read[R](scope: Scope, work: Work[R]) -> R:
    with get_sync_driver().session() as session:
        return session.execute_read(_in_transaction(scope, work))


def write[R](scope: Scope, work: Work[R]) -> R:
    with get_sync_driver().session() as session:
        return session.execute_write(_in_transaction(scope, work))


def single(scope: Scope, query: Query, params: Mapping[str, Any] | None = None) -> Record | None:
    return read(scope, lambda db: db.single(query, params))


def change(scope: Scope, query: Query, params: Mapping[str, Any] | None = None) -> Record | None:
    """Run one writing query and return its first row."""
    return write(scope, lambda db: db.single(query, params))
