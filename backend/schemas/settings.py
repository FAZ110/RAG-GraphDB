from typing import Annotated

from pydantic import BaseModel, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class CustomProvider(BaseModel):
    name: str
    base_url: str
    model: str
    has_api_key: bool


class CustomProviderUpdate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    base_url: Annotated[
        str, StringConstraints(strip_whitespace=True, pattern=r"^https?://\S+$", max_length=300)
    ]
    model: Text
    api_key: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None
