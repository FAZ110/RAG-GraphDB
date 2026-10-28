from fastapi import APIRouter, Response, status

from db.settings import delete_custom_provider, get_custom_provider, set_custom_provider
from schemas.settings import CustomProvider, CustomProviderUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/custom-provider", response_model=CustomProvider | None)
async def get_custom_llm_provider():
    return await get_custom_provider()


@router.put("/custom-provider", response_model=CustomProvider)
async def put_custom_llm_provider(body: CustomProviderUpdate):
    return await set_custom_provider(body.name, body.base_url, body.model, body.api_key)


@router.delete("/custom-provider", status_code=status.HTTP_204_NO_CONTENT)
async def remove_custom_llm_provider():
    await delete_custom_provider()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
