from fastapi import APIRouter, HTTPException, Response, status

from db.errors import SpaceNameTakenError
from db.spaces import create_space, delete_space, get_space, list_spaces, rename_space
from schemas.spaces import Space, SpaceCreate, SpaceUpdate

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


@router.get("/{space_id}", response_model=Space)
async def get_space_by_id(space_id: str):
    space = await get_space(space_id)
    if space is None:
        raise _not_found()
    return space


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
