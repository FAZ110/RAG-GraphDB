from cryptography.fernet import Fernet, InvalidToken

from core.config import SECRETS_KEY


class SecretsKeyError(RuntimeError):
    pass


def _fernet() -> Fernet:
    if not SECRETS_KEY:
        raise SecretsKeyError("SECRETS_KEY is not set, API keys cannot be stored")
    try:
        return Fernet(SECRETS_KEY)
    except ValueError as e:
        raise SecretsKeyError("SECRETS_KEY is not a valid Fernet key") from e


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    try:
        return _fernet().decrypt(token).decode()
    except InvalidToken as e:
        raise SecretsKeyError("Stored API key cannot be decrypted, SECRETS_KEY has changed") from e
