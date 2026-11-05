import pytest

from core.secrets import decrypt
from tests.integration.conftest import cypher

KEY = "sk-moj-tajny-klucz-1234"
BASE = {"name": "Mój model", "base_url": "https://llm.example/v1", "model": "m-1"}


@pytest.fixture
def provider(client, alice) -> dict:
    r = client.post("/settings/providers", json={**BASE, "api_key": KEY}, headers=alice.headers)
    assert r.status_code == 201, r.text
    return r.json()


def stored_key() -> str | None:
    token = cypher("MATCH (p:LlmProvider) RETURN p.api_key_encrypted AS k")[0]["k"]
    return decrypt(token) if token else None


def put(client, user, provider_id: str, **body):
    return client.put(f"/settings/providers/{provider_id}", json=body, headers=user.headers)


@pytest.mark.parametrize(
    "base_url",
    ["llm.example/v1", "ftp://llm.example", "javascript:alert(1)", "https://", "https://a b", ""],
)
def test_base_url_must_be_an_http_address(client, alice, base_url):
    r = client.post(
        "/settings/providers", json={**BASE, "base_url": base_url}, headers=alice.headers
    )
    assert r.status_code == 422
    assert cypher("MATCH (p:LlmProvider) RETURN p") == []


@pytest.mark.parametrize("field", ["name", "model"])
def test_blank_name_or_model_rejected(client, alice, field):
    r = client.post("/settings/providers", json={**BASE, field: "   "}, headers=alice.headers)
    assert r.status_code == 422


def test_shows_only_a_hint_of_the_key(client, alice, provider):
    assert provider["has_api_key"] is True
    assert provider["api_key_hint"] == "1234"
    assert KEY not in client.get("/settings/providers", headers=alice.headers).text


def test_short_key_gets_no_hint(client, alice):
    r = client.post("/settings/providers", json={**BASE, "api_key": "abc"}, headers=alice.headers)
    assert r.json()["api_key_hint"] is None


def test_provider_without_key(client, alice):
    r = client.post("/settings/providers", json=BASE, headers=alice.headers)
    assert r.status_code == 201
    assert r.json()["has_api_key"] is False


def test_update_without_key_keeps_the_stored_key(client, alice, provider):
    r = put(client, alice, provider["id"], **{**BASE, "name": "Nowa nazwa", "model": "m-2"})
    assert r.status_code == 200
    assert (r.json()["name"], r.json()["has_api_key"]) == ("Nowa nazwa", True)
    assert stored_key() == KEY


def test_new_address_without_key_rejected_so_the_key_never_reaches_it(client, alice, provider):
    r = put(client, alice, provider["id"], **{**BASE, "base_url": "https://inny-serwer.example/v1"})
    assert r.status_code == 422
    row = cypher("MATCH (p:LlmProvider) RETURN p.base_url AS u")[0]
    assert row["u"] == BASE["base_url"]
    assert stored_key() == KEY


def test_new_address_with_new_key(client, alice, provider):
    body = {**BASE, "base_url": "https://inny.example/v1", "api_key": "sk-nowy-klucz-9999"}
    r = put(client, alice, provider["id"], **body)
    assert r.status_code == 200
    assert r.json()["api_key_hint"] == "9999"
    assert stored_key() == "sk-nowy-klucz-9999"


def test_empty_key_clears_it(client, alice, provider):
    r = put(client, alice, provider["id"], **{**BASE, "api_key": ""})
    assert r.status_code == 200
    assert r.json()["has_api_key"] is False
    assert stored_key() is None


def test_missing_provider_404(client, alice):
    assert put(client, alice, "nie-ma", **BASE).status_code == 404
    assert client.delete("/settings/providers/nie-ma", headers=alice.headers).status_code == 404


def test_deleted_provider_can_no_longer_be_used(client, alice, space, provider, queued):
    assert client.delete(f"/settings/providers/{provider['id']}", headers=alice.headers).is_success
    body = {"articles": [{"content": "Tekst."}], "provider": f"custom:{provider['id']}"}
    r = client.post(f"/spaces/{space}/articles", json=body, headers=alice.headers)
    assert r.status_code == 422
    assert queued == []


def test_own_provider_goes_to_the_custom_queue(client, alice, space, provider, queued):
    body = {"articles": [{"content": "Tekst."}], "provider": f"custom:{provider['id']}"}
    assert client.post(f"/spaces/{space}/articles", json=body, headers=alice.headers).is_success
    assert queued[0]["provider"] == f"custom:{provider['id']}"
