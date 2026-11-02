from typing import Annotated

from fastapi import Cookie, Depends, HTTPException

from db.spaces.spaces import get_space
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


async def existing_space(space_id: str, user: CurrentUser) -> dict:
    space = await get_space(space_id)
    # Someone else's space answers like a missing one, so ids of others' data reveal nothing.
    if space is None or space["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


ExistingSpace = Annotated[dict, Depends(existing_space)]
