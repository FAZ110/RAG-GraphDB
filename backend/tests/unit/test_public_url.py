import socket

import pytest

from core import public_url
from core.public_url import PrivateUrlError, ensure_public_url


def resolves_to(monkeypatch, *addresses):
    infos = [(None, None, None, "", (a, 0)) for a in addresses]
    monkeypatch.setattr(public_url.socket, "getaddrinfo", lambda *a, **k: infos)


@pytest.mark.parametrize(
    "address",
    ["127.0.0.1", "10.0.0.5", "172.18.0.3", "192.168.1.1", "169.254.169.254", "::1", "fe80::1%3"],
)
def test_private_addresses_are_refused(monkeypatch, address):
    resolves_to(monkeypatch, address)
    with pytest.raises(PrivateUrlError):
        ensure_public_url("http://rabbitmq:15672/v1")


def test_one_private_address_among_public_ones_is_refused(monkeypatch):
    resolves_to(monkeypatch, "104.18.7.192", "10.0.0.5")
    with pytest.raises(PrivateUrlError):
        ensure_public_url("https://api.example.com/v1")


def test_public_address_passes(monkeypatch):
    resolves_to(monkeypatch, "104.18.7.192", "2606:4700::6812:7c0")
    ensure_public_url("https://api.openai.com/v1")


def test_unknown_host_passes(monkeypatch):
    def fail(*a, **k):
        raise socket.gaierror

    monkeypatch.setattr(public_url.socket, "getaddrinfo", fail)
    ensure_public_url("https://llm.example/v1")


def test_switch_allows_private_addresses(monkeypatch):
    resolves_to(monkeypatch, "127.0.0.1")
    monkeypatch.setattr(public_url, "ALLOW_PRIVATE_PROVIDER_URLS", True)
    ensure_public_url("http://localhost:1234/v1")
