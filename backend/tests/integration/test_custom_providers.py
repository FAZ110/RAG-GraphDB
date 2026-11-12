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


@pytest.mark.parametrize(
    "base_url", ["http://127.0.0.1:7474/v1", "http://localhost:15672", "http://169.254.169.254/v1"]
)
def test_base_url_cannot_reach_our_network(client, alice, provider, base_url):
    r = client.post(
        "/settings/providers", json={**BASE, "base_url": base_url}, headers=alice.headers
    )
    assert r.status_code == 422
    assert put(client, alice, provider["id"], **{**BASE, "base_url": base_url}).status_code == 422
    assert cypher("MATCH (p:LlmProvider) RETURN p.base_url AS u") == [{"u": BASE["base_url"]}]


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


@pytest.fixture
def checked(monkeypatch) -> list:
    calls = []

    def fake_check(base_url, model, api_key):
        calls.append((base_url, model, api_key))
        return True, "ok"

    monkeypatch.setattr("api.settings.check_model", fake_check)
    return calls


def check_conn(client, user, **body):
    return client.post("/settings/providers/test", json=body, headers=user.headers)


def test_connection_test_refuses_our_network(client, alice, checked):
    r = check_conn(client, alice, base_url="http://127.0.0.1:7474/v1", model="m")
    assert r.status_code == 422 and checked == []


def test_connection_test_uses_saved_key_only_for_its_address(client, alice, bob, provider, checked):
    pid = provider["id"]
    assert check_conn(client, alice, **BASE, provider_id=pid).json() == {
        "ok": True,
        "message": "ok",
    }
    check_conn(client, alice, **{**BASE, "base_url": "https://inny.example/v1"}, provider_id=pid)
    check_conn(client, bob, **BASE, provider_id=pid)
    check_conn(client, alice, **BASE, api_key="sk-nowy", provider_id=pid)
    assert [c[2] for c in checked] == [KEY, None, None, "sk-nowy"]


def test_local_defaults_to_off_and_can_be_switched_on(client, alice, provider):
    assert provider["local"] is False
    assert put(client, alice, provider["id"], **BASE, local=True).json()["local"] is True
    assert client.get("/settings/providers", headers=alice.headers).json()[0]["local"] is True


def test_worker_reads_the_saved_switch(client, alice, provider):
    from db.settings import custom_provider_is_local

    assert custom_provider_is_local(provider["id"]) is False
    put(client, alice, provider["id"], **BASE, local=True)
    assert custom_provider_is_local(provider["id"]) is True
    assert custom_provider_is_local("usuniety") is True


@pytest.mark.parametrize(("max_parallel", "local"), [(1, True), (4, False)])
def test_model_saved_with_a_parallel_limit_counts_as_local_at_one(
    client, alice, provider, max_parallel, local
):
    cypher(
        "MATCH (p:LlmProvider {id: $id}) REMOVE p.local SET p.max_parallel = $n",
        id=provider["id"],
        n=max_parallel,
    )
    assert client.get("/settings/providers", headers=alice.headers).json()[0]["local"] is local
