from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from starlette.concurrency import run_in_threadpool

from api.dependencies import CurrentUser
from core.config import COOKIE_SECURE, DEV_ACCOUNTS
from db.errors import EmailTakenError
from db.users import (
    create_user,
    get_app_settings,
    password_hash_of,
    set_password_hash,
    touch_login,
    user_with_hash,
)
from schemas.auth import (
    AuthConfig,
    Credentials,
    DevLogin,
    PasswordChange,
    Registration,
    User,
)
from services.auth.bootstrap import DEV_ACCOUNTS as DEV_ACCOUNT_LIST
from services.auth.passwords import hash_password, needs_rehash, verify_password
from services.auth.sessions import (
    SESSION_COOKIE,
    SESSION_TTL_SECONDS,
    clear_attempts,
    count_attempt,
    create_session,
    end_session,
    end_user_sessions,
    too_many,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_WINDOW = 15 * 60
_LOGIN_EMAIL_LIMIT = 5
_LOGIN_IP_LIMIT = 20
_REGISTER_WINDOW = 60 * 60
_REGISTER_IP_LIMIT = 5
_WRONG_CREDENTIALS = "Nieprawidłowy e-mail lub hasło"


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def _check_limit(key: str, limit: int) -> None:
    wait = await too_many(key, limit)
    if wait is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Zbyt wiele prób, spróbuj ponownie za {max(wait // 60, 1)} min",
            headers={"Retry-After": str(wait)},
        )


async def _sign_in(response: Response, user_id: str) -> None:
    # A new token at every sign-in (session fixation).
    token = await create_session(user_id)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        path="/",
    )


@router.get("/config", response_model=AuthConfig)
async def auth_config():
    return {**await get_app_settings(), "dev_accounts": DEV_ACCOUNT_LIST if DEV_ACCOUNTS else []}


@router.post("/dev-login", response_model=User)
async def dev_login(body: DevLogin, response: Response):
    if not DEV_ACCOUNTS or body.email not in {a["email"] for a in DEV_ACCOUNT_LIST}:
        raise HTTPException(status_code=404, detail="Not Found")
    found = await user_with_hash(body.email)
    if found is None or found[0]["disabled"]:
        raise HTTPException(status_code=403, detail="Konto testowe jest niedostępne")
    user = found[0]
    await touch_login(user["id"])
    await _sign_in(response, user["id"])
    return user


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(body: Registration, request: Request, response: Response):
    if not (await get_app_settings())["registration_open"]:
        raise HTTPException(status_code=403, detail="Rejestracja jest wyłączona")
    ip_key = f"register:ip:{_client_ip(request)}"
    await _check_limit(ip_key, _REGISTER_IP_LIMIT)
    await count_attempt(ip_key, _REGISTER_WINDOW)
    if body.password.strip().lower() == body.email:
        raise HTTPException(status_code=422, detail="Hasło nie może być adresem e-mail")
    password_hash = await run_in_threadpool(hash_password, body.password)
    try:
        # Server models spend the app's own API keys: an admin grants them.
        user = await create_user(body.email, password_hash, "user", server_models=False)
    except EmailTakenError as e:
        raise HTTPException(status_code=409, detail="Konto z tym adresem już istnieje") from e
    await touch_login(user["id"])
    await _sign_in(response, user["id"])
    return user


@router.post("/login", response_model=User)
async def login(body: Credentials, request: Request, response: Response):
    keys = (f"login:email:{body.email}", f"login:ip:{_client_ip(request)}")
    await _check_limit(keys[0], _LOGIN_EMAIL_LIMIT)
    await _check_limit(keys[1], _LOGIN_IP_LIMIT)

    found = await user_with_hash(body.email)
    user, password_hash = found or (None, None)
    if not await run_in_threadpool(verify_password, password_hash, body.password):
        for key in keys:
            await count_attempt(key, _LOGIN_WINDOW)
        raise HTTPException(status_code=401, detail=_WRONG_CREDENTIALS)
    if user["disabled"]:
        raise HTTPException(
            status_code=403, detail="Konto zostało zablokowane przez administratora"
        )

    await clear_attempts(keys[0])
    if needs_rehash(password_hash):
        await set_password_hash(user["id"], await run_in_threadpool(hash_password, body.password))
    await touch_login(user["id"])
    await _sign_in(response, user["id"])
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None):
    if token:
        await end_session(token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(SESSION_COOKIE, path="/", secure=COOKIE_SECURE, httponly=True)
    return response


@router.get("/me", response_model=User)
async def me(user: CurrentUser):
    return user


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(body: PasswordChange, user: CurrentUser, response: Response):
    key = f"password:{user['id']}"
    await _check_limit(key, _LOGIN_EMAIL_LIMIT)
    current = await password_hash_of(user["id"])
    if not await run_in_threadpool(verify_password, current, body.current_password):
        await count_attempt(key, _LOGIN_WINDOW)
        raise HTTPException(status_code=400, detail="Obecne hasło jest nieprawidłowe")
    await clear_attempts(key)
    await set_password_hash(user["id"], await run_in_threadpool(hash_password, body.new_password))
    await end_user_sessions(user["id"])
    await _sign_in(response, user["id"])
