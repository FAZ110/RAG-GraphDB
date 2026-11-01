import logging

from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from db.users import admin_exists, claim_orphans, create_user, user_with_hash
from schemas.auth import Registration
from services.auth.passwords import hash_password

log = logging.getLogger("uvicorn.error")


async def ensure_admin(email: str | None, password: str | None) -> str | None:
    """Create the first admin while there is none; never promotes an account or resets a password."""
    if not email or not password:
        return None
    if await admin_exists():
        return "admin exists, ADMIN_PASSWORD is not needed any more"
    try:
        admin = Registration(email=email, password=password)
    except ValidationError as e:
        raise RuntimeError(
            f"ADMIN_EMAIL or ADMIN_PASSWORD is invalid: {e.errors()[0]['msg']}"
        ) from e
    if await user_with_hash(admin.email):
        log.error(
            "ADMIN_EMAIL %s already has an account, which is not made an admin; "
            "use create_admin.py to promote it on purpose",
            admin.email,
        )
        return "not created"
    password_hash = await run_in_threadpool(hash_password, admin.password)
    user = await create_user(admin.email, password_hash, "admin", server_models=True)
    claimed = await claim_orphans(user["id"])
    return (
        f"created admin {admin.email}, who took over {claimed['spaces']} spaces and "
        f"{claimed['providers']} models from before accounts"
    )
