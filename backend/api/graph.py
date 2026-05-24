from fastapi import APIRouter

from db.database import fetch_graph, reset_graph

router = APIRouter()


@router.get("/graph")
async def get_graph():
    return await fetch_graph()


@router.delete("/graph")
async def delete_graph():
    await reset_graph()
    return {"message": "ok"}
