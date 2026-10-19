from typing import Annotated

from fastapi import Depends, HTTPException

from db.spaces.spaces import get_space


async def existing_space(space_id: str) -> dict:
    space = await get_space(space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


ExistingSpace = Annotated[dict, Depends(existing_space)]
