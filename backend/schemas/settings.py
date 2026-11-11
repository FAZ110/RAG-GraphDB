from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
BaseUrl = Annotated[
    str, StringConstraints(strip_whitespace=True, pattern=r"^https?://\S+$", max_length=300)
]
ApiKey = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class CustomProvider(BaseModel):
    id: str
    name: str
    base_url: str
    model: str
    has_api_key: bool
    api_key_hint: str | None
    max_parallel: int


class CustomProviderIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    base_url: BaseUrl
    model: Text
    api_key: ApiKey | None = None
    # Requests sent to this model at once; the custom worker runs at most 6 tasks.
    max_parallel: int = Field(default=1, ge=1, le=6)


class ProviderTestIn(BaseModel):
    base_url: BaseUrl
    model: Text
    api_key: ApiKey | None = None
    # When editing: with no new key, the saved one is used, if the address is unchanged.
    provider_id: str | None = None


class ProviderCheck(BaseModel):
    ok: bool
    message: str
