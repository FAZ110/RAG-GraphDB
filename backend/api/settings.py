import asyncio

from fastapi import APIRouter, HTTPException, Response, status

from api.dependencies import CurrentUser
from core.public_url import PrivateUrlError, ensure_public_url
from core.secrets import SecretsKeyError
from db.errors import ApiKeyRequiredError
from db.settings import (
    create_custom_provider,
    custom_provider_config,
    delete_custom_provider,
    list_custom_providers,
    update_custom_provider,
)
from schemas.settings import CustomProvider, CustomProviderIn, ProviderCheck, ProviderTestIn
from services.llm_service import check_model

router = APIRouter(prefix="/settings/providers", tags=["settings"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Provider not found")


def _secrets_error(e: SecretsKeyError) -> HTTPException:
    return HTTPException(status_code=500, detail=str(e))


async def _check_url(url: str) -> None:
    try:
        await asyncio.to_thread(ensure_public_url, url)
    except PrivateUrlError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.get("", response_model=list[CustomProvider])
async def get_custom_providers(user: CurrentUser):
    return await list_custom_providers(user["id"])


@router.post("", response_model=CustomProvider, status_code=status.HTTP_201_CREATED)
async def post_custom_provider(body: CustomProviderIn, user: CurrentUser):
    await _check_url(body.base_url)
    try:
        return await create_custom_provider(
            user["id"], body.name, body.base_url, body.model, body.api_key, body.max_parallel
        )
    except SecretsKeyError as e:
        raise _secrets_error(e) from e


@router.post("/test", response_model=ProviderCheck)
async def test_custom_provider(body: ProviderTestIn, user: CurrentUser):
    await _check_url(body.base_url)
    api_key = body.api_key
    if not api_key and body.provider_id:
        try:
            saved = await asyncio.to_thread(custom_provider_config, body.provider_id, user["id"])
        except SecretsKeyError as e:
            raise _secrets_error(e) from e
        # A saved key only goes to the address it was saved for.
        if saved and saved["base_url"] == body.base_url:
            api_key = saved["api_key"]
    ok, message = await asyncio.to_thread(check_model, body.base_url, body.model, api_key)
    return {"ok": ok, "message": message}


@router.put("/{provider_id}", response_model=CustomProvider)
async def put_custom_provider(provider_id: str, body: CustomProviderIn, user: CurrentUser):
    await _check_url(body.base_url)
    try:
        provider = await update_custom_provider(
            user["id"],
            provider_id,
            body.name,
            body.base_url,
            body.model,
            body.api_key,
            body.max_parallel,
        )
    except SecretsKeyError as e:
        raise _secrets_error(e) from e
    except ApiKeyRequiredError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if provider is None:
        raise _not_found()
    return provider


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_custom_provider(provider_id: str, user: CurrentUser):
    if not await delete_custom_provider(user["id"], provider_id):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
