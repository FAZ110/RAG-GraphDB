import logging
import secrets
from urllib.parse import urlparse

from starlette.concurrency import run_in_threadpool

from db.users import create_user, user_with_hash
from services.auth.passwords import hash_password

log = logging.getLogger("uvicorn.error")

DEV_ACCOUNTS = [
    {"email": "admin@atlas.test", "role": "admin"},
    {"email": "anna@atlas.test", "role": "user"},
    {"email": "jan@atlas.test", "role": "user"},
]
_LOCAL_HOSTS = {"localhost", "127.0.0.1"}


async def ensure_dev_accounts(enabled: bool, origins: list[str]) -> None:
    """Create the missing test accounts; they sign in only through /auth/dev-login."""
    if not enabled:
        return
    # Refuses to run where the app is served to anyone but this machine.
    if any(urlparse(o).hostname not in _LOCAL_HOSTS for o in origins):
        raise RuntimeError("DEV_ACCOUNTS is for local development only, but CORS_ORIGINS is not")
    log.warning(
        "DEV_ACCOUNTS is on: anyone can sign in as the test accounts, never use it in production"
    )
    for account in DEV_ACCOUNTS:
        if not await user_with_hash(account["email"]):
            # Never typed: the test accounts sign in without one.
            password_hash = await run_in_threadpool(hash_password, secrets.token_urlsafe(24))
            await create_user(account["email"], password_hash, account["role"], server_models=True)
