from typing import Annotated

from pydantic import BaseModel, StringConstraints

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
    local: bool


class CustomProviderIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    base_url: BaseUrl
    model: Text
    api_key: ApiKey | None = None
    # On the user's computer (behind a tunnel): gets one request at a time.
    local: bool = False


class ProviderTestIn(BaseModel):
    base_url: BaseUrl
    model: Text
    api_key: ApiKey | None = None
    # When editing: with no new key, the saved one is used, if the address is unchanged.
    provider_id: str | None = None


class ProviderCheck(BaseModel):
    ok: bool
    message: str
