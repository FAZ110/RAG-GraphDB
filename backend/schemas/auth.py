import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, StringConstraints
from pydantic_core import PydanticCustomError

PASSWORD_MIN_LENGTH = 10


def _email_shape(value: str) -> str:
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise PydanticCustomError("email", "Podaj poprawny adres e-mail, np. jan@example.com")
    return value


LoginEmail = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=254)]
Email = Annotated[LoginEmail, AfterValidator(_email_shape)]
Password = Annotated[str, StringConstraints(min_length=PASSWORD_MIN_LENGTH, max_length=128)]
AnyPassword = Annotated[str, StringConstraints(min_length=1, max_length=128)]


def _not_blank(value: str) -> str:
    if not value.strip():
        raise PydanticCustomError("password", "Hasło nie może składać się z samych spacji")
    return value


class Credentials(BaseModel):
    email: LoginEmail
    password: AnyPassword


class Registration(BaseModel):
    email: Email
    password: Annotated[Password, AfterValidator(_not_blank)]


class PasswordChange(BaseModel):
    current_password: AnyPassword
    new_password: Annotated[Password, AfterValidator(_not_blank)]


Role = Literal["user", "admin"]


class User(BaseModel):
    id: str
    email: str
    role: Role
    server_models: bool


class AdminUser(User):
    disabled: bool
    created_at: datetime
    last_login_at: datetime | None
    space_count: int
    article_count: int


class UserChanges(BaseModel):
    role: Role | None = None
    disabled: bool | None = None
    server_models: bool | None = None


class AppSettings(BaseModel):
    registration_open: bool


class DevAccount(BaseModel):
    email: str
    role: Role


class AuthConfig(AppSettings):
    dev_accounts: list[DevAccount]


class DevLogin(BaseModel):
    email: str
