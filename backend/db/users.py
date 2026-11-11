import uuid
from collections.abc import Mapping
from typing import Any

from neo4j.exceptions import ConstraintError

from db.access import gate
from db.access.queries import load_queries
from db.access.scopes import SYSTEM, AdminScope
from db.driver import translates_neo4j_errors
from db.errors import EmailTakenError
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
    try:
        [row] = await gate.change(SYSTEM, _QUERIES["create_user"], params)
    except ConstraintError as e:
        raise EmailTakenError(email) from e
    return _user(row["u"])


@translates_neo4j_errors
async def get_user(user_id: str) -> dict | None:
    row = await gate.single(SYSTEM, _QUERIES["user_by_id"], {"id": user_id})
    return _user(row["u"]) if row else None


@translates_neo4j_errors
async def user_with_hash(email: str) -> tuple[dict, str] | None:
    row = await gate.single(SYSTEM, _QUERIES["user_by_email"], {"email": email})
    return (_user(row["u"]), row["u"]["password_hash"]) if row else None


@translates_neo4j_errors
async def password_hash_of(user_id: str) -> str | None:
    row = await gate.single(SYSTEM, _QUERIES["user_by_id"], {"id": user_id})
    return row["u"]["password_hash"] if row else None


@translates_neo4j_errors
async def touch_login(user_id: str) -> None:
    await gate.change(SYSTEM, _QUERIES["touch_login"], {"id": user_id})


@translates_neo4j_errors
async def set_password_hash(user_id: str, password_hash: str) -> None:
    params = {"id": user_id, "password_hash": password_hash}
    await gate.change(SYSTEM, _QUERIES["set_password_hash"], params)


@translates_neo4j_errors
async def list_users(scope: AdminScope) -> list[dict]:
    return [
        {**_user(r["u"]), "space_count": r["space_count"], "article_count": r["article_count"]}
        for r in await gate.rows(scope, _QUERIES["list_users"])
    ]


@translates_neo4j_errors
async def update_user(scope: AdminScope, user_id: str, changes: dict) -> dict | None:
    params = {"id": user_id, "changes": changes}
    rows = await gate.change(scope, _QUERIES["update_user"], params)
    return _user(rows[0]["u"]) if rows else None


@translates_neo4j_errors
async def delete_user(scope: AdminScope, user_id: str) -> None:
    rows = await gate.rows(scope, _QUERIES["owned_space_ids"], {"id": user_id})
    for row in rows:
        await delete_space(scope.for_space(row["id"], user_id))
    await gate.change(scope, _QUERIES["delete_user"], {"id": user_id})


@translates_neo4j_errors
async def claim_orphans(user_id: str) -> dict:
    [row] = await gate.change(SYSTEM, _QUERIES["claim_orphans"], {"id": user_id})
    return dict(row)


@translates_neo4j_errors
async def get_app_settings() -> dict:
    # Created on first use, so it is a write.
    [row] = await gate.change(SYSTEM, _QUERIES["app_settings"])
    return dict(row)


@translates_neo4j_errors
async def set_app_settings(scope: AdminScope, registration_open: bool) -> dict:
    params = {"registration_open": registration_open}
    [row] = await gate.change(scope, _QUERIES["set_app_settings"], params)
    return dict(row)
