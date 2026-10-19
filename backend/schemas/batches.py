from datetime import datetime

from pydantic import BaseModel


class Batch(BaseModel):
    id: str
    space_id: str
    space_name: str
    created_at: datetime
    total: int
    ok: int
    pending: int
    processing: int
    error: int
    nodes_count: int
    edges_count: int
