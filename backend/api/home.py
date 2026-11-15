from fastapi import APIRouter

from api.dependencies import Owner
from db.home import home_overview
from schemas.home import Home

router = APIRouter(prefix="/home", tags=["home"])


@router.get("", response_model=Home)
async def get_home(owner: Owner):
    """The start page; opening it also records the visit."""
    return await home_overview(owner)
