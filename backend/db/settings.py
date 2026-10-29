import uuid

from core.secrets import decrypt, encrypt
from db.driver import get_driver, get_sync_driver, translates_neo4j_errors
from db.errors import ApiKeyRequiredError
from db.query_loader import load_queries

_QUERIES = load_queries(__file__)
_HINT_MIN_LENGTH = 16


def _key_fields(api_key: str) -> dict:
    if not api_key:
        return {"api_key_encrypted": None, "api_key_hint": None}
    hint = api_key[-4:] if len(api_key) >= _HINT_MIN_LENGTH else None
    return {"api_key_encrypted": encrypt(api_key), "api_key_hint": hint}


@translates_neo4j_errors
async def list_custom_providers() -> list[dict]:
    async with get_driver().session() as session:
        return [dict(r) async for r in await session.run(_QUERIES["list_custom_providers"])]


@translates_neo4j_errors
async def create_custom_provider(name: str, base_url: str, model: str, api_key: str | None) -> dict:
    params = {
        "id": str(uuid.uuid4()),
        "name": name,
        "base_url": base_url,
        "model": model,
        **_key_fields(api_key or ""),
    }
    async with get_driver().session() as session:
        return dict(await (await session.run(_QUERIES["create_custom_provider"], params)).single())


@translates_neo4j_errors
async def update_custom_provider(
    provider_id: str, name: str, base_url: str, model: str, api_key: str | None
) -> dict | None:
    params = {
        "id": provider_id,
        "name": name,
        "base_url": base_url,
        "model": model,
        "replace_key": api_key is not None,
        **_key_fields(api_key or ""),
    }
    async with get_driver().session() as session:
        if api_key is None:
            res = await session.run(_QUERIES["get_custom_provider_config"], {"id": provider_id})
            current = await res.single()
            if current and current["api_key_encrypted"] and current["base_url"] != base_url:
                raise ApiKeyRequiredError("Enter the API key again when changing the API address")
        row = await (await session.run(_QUERIES["update_custom_provider"], params)).single()
        return dict(row) if row else None


@translates_neo4j_errors
async def delete_custom_provider(provider_id: str) -> bool:
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["delete_custom_provider"], {"id": provider_id})
        return (await res.single())["deleted"] > 0


def custom_provider_config(provider_id: str) -> dict | None:
    with get_sync_driver().session() as session:
        row = session.run(_QUERIES["get_custom_provider_config"], {"id": provider_id}).single()
    if row is None:
        return None
    token = row["api_key_encrypted"]
    return {
        "base_url": row["base_url"],
        "model": row["model"],
        "api_key": decrypt(token) if token else None,
    }
