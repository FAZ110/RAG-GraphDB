from typing import Annotated

from fastapi import Cookie, Depends, HTTPException

from db.access.scopes import AdminScope, SpaceScope, UserScope
from db.spaces.spaces import owned_space
from db.users import get_user
from services.auth.sessions import SESSION_COOKIE, end_session, session_user_id


def _unauthenticated() -> HTTPException:
    return HTTPException(status_code=401, detail="Zaloguj się, aby kontynuować")


async def current_user(
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> dict:
    if not token:
        raise _unauthenticated()
    user_id = await session_user_id(token)
    user = await get_user(user_id) if user_id else None
    if user is None or user["disabled"]:
        if user_id:
            await end_session(token)
        raise _unauthenticated()
    return user


CurrentUser = Annotated[dict, Depends(current_user)]


async def require_admin(user: CurrentUser) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Wymagane uprawnienia administratora")
    return user


async def user_scope(user: CurrentUser) -> UserScope:
    return UserScope(user_id=user["id"])


Owner = Annotated[UserScope, Depends(user_scope)]


async def admin_scope(admin: Annotated[dict, Depends(require_admin)]) -> AdminScope:
    return AdminScope(user_id=admin["id"])


Admin = Annotated[AdminScope, Depends(admin_scope)]


async def space_scope(space_id: str, owner: Owner) -> SpaceScope:
    """The scope every query of a space's data needs, given only after the ownership check."""
    scope = await owned_space(owner, space_id)
    # Someone else's space answers like a missing one, so ids of others' data reveal nothing.
    if scope is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return scope


SpaceAccess = Annotated[SpaceScope, Depends(space_scope)]
