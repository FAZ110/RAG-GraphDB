import uuid

from core.secrets import decrypt, encrypt
from db.access import gate, sync_gate
from db.access.queries import load_queries
from db.access.runner import Runner
from db.access.scopes import SpaceScope, UserScope
from db.driver import translates_neo4j_errors
from db.errors import ApiKeyRequiredError

_QUERIES = load_queries(__file__)
_HINT_MIN_LENGTH = 16


def _key_fields(api_key: str) -> dict:
    if not api_key:
        return {"api_key_encrypted": None, "api_key_hint": None}
    hint = api_key[-4:] if len(api_key) >= _HINT_MIN_LENGTH else None
    return {"api_key_encrypted": encrypt(api_key), "api_key_hint": hint}


@translates_neo4j_errors
async def list_custom_providers(scope: UserScope) -> list[dict]:
    return [dict(r) for r in await gate.rows(scope, _QUERIES["list_custom_providers"])]


@translates_neo4j_errors
async def create_custom_provider(
    scope: UserScope, name: str, base_url: str, model: str, api_key: str | None
) -> dict:
    params = {
        "id": str(uuid.uuid4()),
        "name": name,
        "base_url": base_url,
        "model": model,
        **_key_fields(api_key or ""),
    }
    [row] = await gate.change(scope, _QUERIES["create_custom_provider"], params)
    return dict(row)


@translates_neo4j_errors
async def update_custom_provider(
    scope: UserScope, provider_id: str, name: str, base_url: str, model: str, api_key: str | None
) -> dict | None:
    params = {
        "id": provider_id,
        "name": name,
        "base_url": base_url,
        "model": model,
        "replace_key": api_key is not None,
        **_key_fields(api_key or ""),
    }

    async def work(db: Runner) -> dict | None:
        if api_key is None:
            current = await db.single(_QUERIES["get_custom_provider_config"], {"id": provider_id})
            if current and current["api_key_encrypted"] and current["base_url"] != base_url:
                raise ApiKeyRequiredError("Enter the API key again when changing the API address")
        row = await db.single(_QUERIES["update_custom_provider"], params)
        return dict(row) if row else None

    return await gate.write(scope, work)


@translates_neo4j_errors
async def delete_custom_provider(scope: UserScope, provider_id: str) -> bool:
    rows = await gate.change(scope, _QUERIES["delete_custom_provider"], {"id": provider_id})
    return rows[0]["deleted"] > 0


@translates_neo4j_errors
async def owns_custom_provider(scope: UserScope, provider_id: str) -> bool:
    row = await gate.single(scope, _QUERIES["get_custom_provider_config"], {"id": provider_id})
    return row is not None


def custom_provider_config(scope: SpaceScope, provider_id: str) -> dict | None:
    """The provider of the space's owner, as the extraction worker uses it."""
    row = sync_gate.single(scope, _QUERIES["get_custom_provider_config"], {"id": provider_id})
    if row is None:
        return None
    token = row["api_key_encrypted"]
    return {
        "base_url": row["base_url"],
        "model": row["model"],
        "api_key": decrypt(token) if token else None,
    }
