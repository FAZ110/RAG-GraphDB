from datetime import datetime

from fastapi import APIRouter

from api.dependencies import CurrentUser
from db.home import home_overview
from schemas.home import Home

router = APIRouter(prefix="/home", tags=["home"])


@router.get("", response_model=Home)
async def get_home(user: CurrentUser, since: datetime | None = None):
    """The start page; `since` is the previous visit, to count what was added after it."""
    return await home_overview(user["id"], since)
