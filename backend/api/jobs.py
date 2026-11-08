from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.dependencies import CurrentUser
from services.jobs.events import job_events, job_owner

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}/events")
async def get_job_events(job_id: str, user: CurrentUser):
    if await job_owner(job_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
    return StreamingResponse(
        job_events(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
