from db.driver import get_driver, get_sync_driver, translates_neo4j_errors
from db.query_loader import load_queries

_QUERIES = load_queries(__file__)


def _public(row) -> dict | None:
    if row is None:
        return None
    return {
        "name": row["name"],
        "base_url": row["base_url"],
        "model": row["model"],
        "has_api_key": bool(row["api_key"]),
    }


@translates_neo4j_errors
async def get_custom_provider() -> dict | None:
    async with get_driver().session() as session:
        return _public(await (await session.run(_QUERIES["get_custom_provider"])).single())


@translates_neo4j_errors
async def set_custom_provider(name: str, base_url: str, model: str, api_key: str | None) -> dict:
    params = {"name": name, "base_url": base_url, "model": model, "api_key": api_key}
    async with get_driver().session() as session:
        return _public(await (await session.run(_QUERIES["set_custom_provider"], params)).single())


@translates_neo4j_errors
async def delete_custom_provider() -> None:
    async with get_driver().session() as session:
        await (await session.run(_QUERIES["delete_custom_provider"])).consume()


def custom_provider_config() -> dict | None:
    with get_sync_driver().session() as session:
        row = session.run(_QUERIES["get_custom_provider"]).single()
    return dict(row) if row else None
