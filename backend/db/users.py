import uuid
from collections.abc import Mapping
from typing import Any

from neo4j.exceptions import ConstraintError

from db.driver import get_driver, translates_neo4j_errors
from db.errors import EmailTakenError
from db.query_loader import load_queries
from db.spaces.spaces import delete_space

_QUERIES = load_queries(__file__)


def _user(node: Mapping[str, Any]) -> dict:
    last_login = node.get("last_login_at")
    return {
        "id": node["id"],
        "email": node["email"],
        "role": node["role"],
        "disabled": node.get("disabled", False),
        "server_models": node.get("server_models", False),
        "created_at": node["created_at"].to_native(),
        "last_login_at": last_login.to_native() if last_login else None,
    }


@translates_neo4j_errors
async def create_user(email: str, password_hash: str, role: str, server_models: bool) -> dict:
    params = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "server_models": server_models,
    }
    async with get_driver().session() as session:
        try:
            row = await (await session.run(_QUERIES["create_user"], params)).single()
        except ConstraintError as e:
            raise EmailTakenError(email) from e
        return _user(row["u"])


@translates_neo4j_errors
async def get_user(user_id: str) -> dict | None:
    async with get_driver().session() as session:
        row = await (await session.run(_QUERIES["user_by_id"], {"id": user_id})).single()
        return _user(row["u"]) if row else None


@translates_neo4j_errors
async def user_with_hash(email: str) -> tuple[dict, str] | None:
    async with get_driver().session() as session:
        row = await (await session.run(_QUERIES["user_by_email"], {"email": email})).single()
        return (_user(row["u"]), row["u"]["password_hash"]) if row else None


@translates_neo4j_errors
async def password_hash_of(user_id: str) -> str | None:
    async with get_driver().session() as session:
        row = await (await session.run(_QUERIES["user_by_id"], {"id": user_id})).single()
        return row["u"]["password_hash"] if row else None


@translates_neo4j_errors
async def touch_login(user_id: str) -> None:
    async with get_driver().session() as session:
        await (await session.run(_QUERIES["touch_login"], {"id": user_id})).consume()


@translates_neo4j_errors
async def set_password_hash(user_id: str, password_hash: str) -> None:
    params = {"id": user_id, "password_hash": password_hash}
    async with get_driver().session() as session:
        await (await session.run(_QUERIES["set_password_hash"], params)).consume()


@translates_neo4j_errors
async def list_users() -> list[dict]:
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["list_users"])
        return [
            {**_user(r["u"]), "space_count": r["space_count"], "article_count": r["article_count"]}
            async for r in res
        ]


@translates_neo4j_errors
async def update_user(user_id: str, changes: dict) -> dict | None:
    async with get_driver().session() as session:
        params = {"id": user_id, "changes": changes}
        row = await (await session.run(_QUERIES["update_user"], params)).single()
        return _user(row["u"]) if row else None


@translates_neo4j_errors
async def delete_user(user_id: str) -> None:
    async with get_driver().session() as session:
        res = await session.run(_QUERIES["owned_space_ids"], {"id": user_id})
        space_ids = [r["id"] async for r in res]
    for space_id in space_ids:
        await delete_space(space_id)
    async with get_driver().session() as session:
        await (await session.run(_QUERIES["delete_user"], {"id": user_id})).consume()


@translates_neo4j_errors
async def claim_orphans(user_id: str) -> dict:
    async with get_driver().session() as session:
        row = await (await session.run(_QUERIES["claim_orphans"], {"id": user_id})).single()
        return dict(row)


@translates_neo4j_errors
async def get_app_settings() -> dict:
    async with get_driver().session() as session:
        return dict(await (await session.run(_QUERIES["app_settings"])).single())


@translates_neo4j_errors
async def set_app_settings(registration_open: bool) -> dict:
    params = {"registration_open": registration_open}
    async with get_driver().session() as session:
        return dict(await (await session.run(_QUERIES["set_app_settings"], params)).single())
