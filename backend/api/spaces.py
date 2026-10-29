from fastapi import APIRouter, HTTPException, Response, status

from api.dependencies import ExistingSpace
from db.errors import SpaceNameTakenError
from db.spaces.spaces import (
    create_space,
    delete_space,
    get_extraction_settings,
    list_spaces,
    rename_space,
    reorder_spaces,
    set_extraction_settings,
)
from db.spaces.stats import space_stats
from schemas.spaces import (
    ExtractionSettings,
    ExtractionSettingsUpdate,
    Space,
    SpaceCreate,
    SpaceOrder,
    SpaceStats,
    SpaceUpdate,
)
from services.llm_service import DEFAULT_LABELS

router = APIRouter(prefix="/spaces", tags=["spaces"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Space not found")


def _name_taken(name: str) -> HTTPException:
    return HTTPException(status_code=409, detail=f"Space '{name}' already exists")


@router.get("", response_model=list[Space])
async def get_spaces():
    return await list_spaces()


@router.post("", response_model=Space, status_code=status.HTTP_201_CREATED)
async def post_space(body: SpaceCreate):
    try:
        return await create_space(body.name)
    except SpaceNameTakenError as e:
        raise _name_taken(body.name) from e


@router.put("/order", status_code=status.HTTP_204_NO_CONTENT)
async def put_space_order(body: SpaceOrder):
    await reorder_spaces(body.space_ids)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{space_id}", response_model=Space)
async def get_space_by_id(space: ExistingSpace):
    return space


@router.get("/{space_id}/stats", response_model=SpaceStats)
async def get_space_stats(space: ExistingSpace):
    return await space_stats(space["id"])


def _effective(settings: dict) -> dict:
    return {
        "rules": settings["rules"] or "",
        "labels": settings["labels"] or DEFAULT_LABELS,
    }


@router.get("/{space_id}/extraction-settings", response_model=ExtractionSettings)
async def get_space_extraction_settings(space_id: str):
    settings = await get_extraction_settings(space_id)
    if settings is None:
        raise _not_found()
    return _effective(settings)


@router.put("/{space_id}/extraction-settings", response_model=ExtractionSettings)
async def put_space_extraction_settings(space_id: str, body: ExtractionSettingsUpdate):
    labels = list(dict.fromkeys(body.labels)) if body.labels else None
    settings = await set_extraction_settings(space_id, body.rules, labels)
    if settings is None:
        raise _not_found()
    return _effective(settings)


@router.patch("/{space_id}", response_model=Space)
async def patch_space(space_id: str, body: SpaceUpdate):
    try:
        space = await rename_space(space_id, body.name)
    except SpaceNameTakenError as e:
        raise _name_taken(body.name) from e
    if space is None:
        raise _not_found()
    return space


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_space(space_id: str):
    if not await delete_space(space_id):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
