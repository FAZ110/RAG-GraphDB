from fastapi import APIRouter, HTTPException, Response, status

from core.secrets import SecretsKeyError
from db.errors import ApiKeyRequiredError
from db.settings import (
    create_custom_provider,
    delete_custom_provider,
    list_custom_providers,
    update_custom_provider,
)
from schemas.settings import CustomProvider, CustomProviderIn

router = APIRouter(prefix="/settings/providers", tags=["settings"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Provider not found")


def _secrets_error(e: SecretsKeyError) -> HTTPException:
    return HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[CustomProvider])
async def get_custom_providers():
    return await list_custom_providers()


@router.post("", response_model=CustomProvider, status_code=status.HTTP_201_CREATED)
async def post_custom_provider(body: CustomProviderIn):
    try:
        return await create_custom_provider(body.name, body.base_url, body.model, body.api_key)
    except SecretsKeyError as e:
        raise _secrets_error(e) from e


@router.put("/{provider_id}", response_model=CustomProvider)
async def put_custom_provider(provider_id: str, body: CustomProviderIn):
    try:
        provider = await update_custom_provider(
            provider_id, body.name, body.base_url, body.model, body.api_key
        )
    except SecretsKeyError as e:
        raise _secrets_error(e) from e
    except ApiKeyRequiredError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if provider is None:
        raise _not_found()
    return provider


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_custom_provider(provider_id: str):
    if not await delete_custom_provider(provider_id):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
