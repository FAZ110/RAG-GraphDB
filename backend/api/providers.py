from fastapi import HTTPException

from api.dependencies import SpaceAccess
from db.settings import owns_custom_provider
from services.llm_service import CUSTOM_PROVIDER_PREFIX


async def check_provider(user: dict, space: SpaceAccess, provider: str | None) -> None:
    if provider is None:
        return
    if provider.startswith(CUSTOM_PROVIDER_PREFIX):
        if not await owns_custom_provider(
            space.owner(), provider.removeprefix(CUSTOM_PROVIDER_PREFIX)
        ):
            raise HTTPException(status_code=422, detail="Wybrany model nie istnieje")
    elif not user["server_models"]:
        raise HTTPException(
            status_code=403,
            detail="Administrator nie udostępnił Ci modeli serwera, dodaj własny model w ustawieniach",
        )
