from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from services.jobs.events import job_events

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}/events")
async def get_job_events(job_id: str):
    return StreamingResponse(
        job_events(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
