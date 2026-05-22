from fastapi import APIRouter

from db.database import fetch_graph

router = APIRouter()


@router.get("/graph")
async def get_graph():
    return await fetch_graph()
