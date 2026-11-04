import pytest
from cryptography.fernet import Fernet

import core.secrets
from core.secrets import SecretsKeyError, decrypt, encrypt


def test_encrypt_round_trip_and_ciphertext_differs():
    token = encrypt("sk-abc")
    assert token != "sk-abc"
    assert decrypt(token) == "sk-abc"


def test_decrypt_with_other_key_raises(monkeypatch):
    token = encrypt("sk-abc")
    monkeypatch.setattr(core.secrets, "SECRETS_KEY", Fernet.generate_key().decode())
    with pytest.raises(SecretsKeyError):
        decrypt(token)


def test_missing_key_raises(monkeypatch):
    monkeypatch.setattr(core.secrets, "SECRETS_KEY", None)
    with pytest.raises(SecretsKeyError):
        encrypt("sk-abc")


def test_invalid_key_raises(monkeypatch):
    monkeypatch.setattr(core.secrets, "SECRETS_KEY", "too-short")
    with pytest.raises(SecretsKeyError):
        encrypt("sk-abc")
