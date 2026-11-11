from fastapi import APIRouter, Depends, HTTPException, Response, status

from api.dependencies import Admin, CurrentUser, require_admin
from db.users import delete_user, get_user, list_users, set_app_settings, update_user
from schemas.auth import AdminUser, AppSettings, User, UserChanges
from services.auth.sessions import end_user_sessions

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Użytkownik nie istnieje")


def _not_self(admin: dict, user_id: str) -> None:
    if admin["id"] == user_id:
        raise HTTPException(
            status_code=400, detail="Nie możesz zablokować, usunąć ani zdegradować własnego konta"
        )


@router.get("/users", response_model=list[AdminUser])
async def get_users(admin: Admin):
    return await list_users(admin)


@router.patch("/users/{user_id}", response_model=User)
async def patch_user(user_id: str, body: UserChanges, admin: CurrentUser, scope: Admin):
    changes = body.model_dump(exclude_none=True)
    if "role" in changes or "disabled" in changes:
        _not_self(admin, user_id)
    user = await update_user(scope, user_id, changes)
    if user is None:
        raise _not_found()
    if changes.get("disabled") or "role" in changes:
        await end_user_sessions(user_id)
    return user


@router.post("/users/{user_id}/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(user_id: str):
    if await get_user(user_id) is None:
        raise _not_found()
    await end_user_sessions(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(user_id: str, admin: CurrentUser, scope: Admin):
    _not_self(admin, user_id)
    if await get_user(user_id) is None:
        raise _not_found()
    await end_user_sessions(user_id)
    await delete_user(scope, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/settings", response_model=AppSettings)
async def put_settings(body: AppSettings, admin: Admin):
    return await set_app_settings(admin, body.registration_open)
