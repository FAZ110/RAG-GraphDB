import functools
from collections.abc import Awaitable, Callable

from neo4j import AsyncDriver, AsyncGraphDatabase, Driver, GraphDatabase
from neo4j.exceptions import DriverError, Neo4jError, TransientError

from core.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER
from db.errors import GraphDatabaseError

_driver: AsyncDriver | None = None
_sync_driver: Driver | None = None


def translates_neo4j_errors[**P, R](fn: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
    """Turn driver and server failures into one GraphDatabaseError.

    DriverError covers the client side (ServiceUnavailable, SessionExpired) and
    is *not* a Neo4jError, so catching only the latter misses an unreachable
    database entirely. TransientError is retryable, so it reports 503 like the
    driver-side failures; anything else the server rejects is our bug, not a
    availability problem, and stays a 500.
    """

    @functools.wraps(fn)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return await fn(*args, **kwargs)
        except DriverError as e:
            raise GraphDatabaseError(f"Neo4j unavailable: {e}", 503) from e
        except TransientError as e:
            raise GraphDatabaseError(f"Neo4j temporarily unavailable: {e.message}", 503) from e
        except Neo4jError as e:
            raise GraphDatabaseError(f"Neo4j error: {e.message}", 500) from e

    return wrapper


def get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


def get_sync_driver() -> Driver:
    """Sync driver used by Celery workers, which do not run an event loop."""
    global _sync_driver
    if _sync_driver is None:
        _sync_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _sync_driver


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
