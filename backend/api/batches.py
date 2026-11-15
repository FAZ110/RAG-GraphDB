from typing import Literal

from fastapi import APIRouter, Depends, Response, status

from api.dependencies import Owner, SpaceAccess, space_scope
from db.spaces.batches import latest_batch, running_batches
from schemas.batches import Batch
from services.jobs.extraction import cancel_extraction, pause_extraction, resume_extraction

router = APIRouter(tags=["batches"])


@router.get(
    "/spaces/{space_id}/batches/latest",
    response_model=Batch | None,
    dependencies=[Depends(space_scope)],
)
async def get_latest_batch(space: SpaceAccess):
    return await latest_batch(space)


@router.get("/batches/running", response_model=list[Batch])
async def get_running_batches(owner: Owner):
    return await running_batches(owner)


_ACTIONS = {"pause": pause_extraction, "resume": resume_extraction, "cancel": cancel_extraction}


@router.post(
    "/spaces/{space_id}/batches/{batch_id}/{action}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(space_scope)],
)
async def change_batch(
    space: SpaceAccess, batch_id: str, action: Literal["pause", "resume", "cancel"]
):
    await _ACTIONS[action](space, batch_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
