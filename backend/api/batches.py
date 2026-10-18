from fastapi import APIRouter, Depends

from api.dependencies import existing_space
from db.spaces.batches import latest_batch, running_batches
from schemas.batches import Batch

router = APIRouter(tags=["batches"])


@router.get(
    "/spaces/{space_id}/batches/latest",
    response_model=Batch | None,
    dependencies=[Depends(existing_space)],
)
async def get_latest_batch(space_id: str):
    return await latest_batch(space_id)


@router.get("/batches/running", response_model=list[Batch])
async def get_running_batches():
    return await running_batches()
