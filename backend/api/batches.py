from typing import Literal

from fastapi import APIRouter, Depends, Response, status

from api.dependencies import CurrentUser, existing_space
from db.spaces.batches import latest_batch, running_batches
from schemas.batches import Batch
from services.jobs.extraction import cancel_extraction, pause_extraction, resume_extraction

router = APIRouter(tags=["batches"])


@router.get(
    "/spaces/{space_id}/batches/latest",
    response_model=Batch | None,
    dependencies=[Depends(existing_space)],
)
async def get_latest_batch(space_id: str):
    return await latest_batch(space_id)


@router.get("/batches/running", response_model=list[Batch])
async def get_running_batches(user: CurrentUser):
    return await running_batches(user["id"])


_ACTIONS = {"pause": pause_extraction, "resume": resume_extraction, "cancel": cancel_extraction}


@router.post(
    "/spaces/{space_id}/batches/{batch_id}/{action}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(existing_space)],
)
async def change_batch(space_id: str, batch_id: str, action: Literal["pause", "resume", "cancel"]):
    await _ACTIONS[action](space_id, batch_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
