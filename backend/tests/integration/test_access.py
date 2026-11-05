import pytest

from core.secrets import decrypt
from tests.integration.conftest import cypher

API_KEY = "sk-supersecret-123456"

# Every route under someone else's space must answer like a missing one.
FOREIGN = [
    ("GET", "/spaces/{s}", None),
    ("GET", "/spaces/{s}/stats", None),
    ("PATCH", "/spaces/{s}", {"name": "Przejęta"}),
    ("DELETE", "/spaces/{s}", None),
    ("GET", "/spaces/{s}/articles", None),
    ("GET", "/spaces/{s}/articles/{a}", None),
    ("POST", "/spaces/{s}/articles", {"articles": [{"content": "Obcy tekst."}]}),
    ("POST", "/spaces/{s}/articles/delete", {"article_ids": ["{a}"]}),
    ("DELETE", "/spaces/{s}/articles/{a}", None),
    ("DELETE", "/spaces/{s}/articles", None),
    ("GET", "/spaces/{s}/graph", None),
    ("GET", "/spaces/{s}/graph/nodes/{n}", None),
    ("PATCH", "/spaces/{s}/graph/nodes/{n}", {"name": "Przejęty"}),
    ("DELETE", "/spaces/{s}/graph/nodes/{n}", None),
    ("GET", "/spaces/{s}/analyses", None),
    ("POST", "/spaces/{s}/analyses", {}),
    ("GET", "/spaces/{s}/analyses/{an}", None),
    ("PATCH", "/spaces/{s}/analyses/{an}", {"name": "Przejęta"}),
    ("DELETE", "/spaces/{s}/analyses/{an}", None),
    ("GET", "/spaces/{s}/batches/latest", None),
    ("POST", "/spaces/{s}/batches/{j}/cancel", None),
    ("GET", "/spaces/{s}/extraction-settings", None),
    ("PUT", "/spaces/{s}/extraction-settings", {"rules": "Przejęte"}),
]


@pytest.fixture
def world(client, alice, space, queued) -> dict:
    """Alice's space with one article, node, analysis, custom model and job."""
    h = alice.headers
    upload = {"articles": [{"title": "T", "content": "Jan Kowalski mieszka w Warszawie."}]}
    r = client.post(f"/spaces/{space}/articles", json=upload, headers=h)
    assert r.status_code == 202, r.text
    node = client.post(
        f"/spaces/{space}/graph/nodes", json={"name": "Jan Kowalski", "label": "OSOBA"}, headers=h
    )
    assert node.status_code == 201, node.text
    analysis = client.post(f"/spaces/{space}/analyses", json={}, headers=h)
    assert analysis.status_code == 201, analysis.text
    provider = client.post(
        "/settings/providers",
        json={
            "name": "Mój",
            "base_url": "https://llm.example/v1",
            "model": "m",
            "api_key": API_KEY,
        },
        headers=h,
    )
    assert provider.status_code == 201, provider.text
    return {
        "s": space,
        "a": queued[0]["article_id"],
        "j": r.json()["job_id"],
        "n": node.json()["id"],
        "an": analysis.json()["id"],
        "p": provider.json()["id"],
    }


def fill(value, ids: dict):
    if isinstance(value, str):
        return value.format(**ids)
    if isinstance(value, list):
        return [fill(v, ids) for v in value]
    if isinstance(value, dict):
        return {k: fill(v, ids) for k, v in value.items()}
    return value


@pytest.mark.parametrize(
    ("method", "path", "body"), FOREIGN, ids=[f"{m} {p}" for m, p, _ in FOREIGN]
)
def test_foreign_space_looks_missing(client, world, bob, method, path, body):
    r = client.request(method, fill(path, world), json=fill(body, world), headers=bob.headers)
    # The ownership check's own answer, not a 404 of a route that does not exist.
    assert (r.status_code, r.json()["detail"]) == (404, "Space not found"), r.text


def test_foreign_space_untouched_after_attempts(client, world, alice, bob):
    for method, path, body in FOREIGN:
        client.request(method, fill(path, world), json=fill(body, world), headers=bob.headers)
    s, h = world["s"], alice.headers
    assert client.get(f"/spaces/{s}", headers=h).json()["name"] == "Przestrzeń"
    assert len(client.get(f"/spaces/{s}/articles", headers=h).json()) == 1
    assert "Przejęt" not in client.get(f"/spaces/{s}/graph/nodes/{world['n']}", headers=h).text
    assert client.get(f"/spaces/{s}/analyses/{world['an']}", headers=h).json()["name"] == (
        "Nowa analiza"
    )
    assert client.get(f"/spaces/{s}/extraction-settings", headers=h).json()["rules"] != "Przejęte"


def test_lists_show_only_own_data(client, world, bob):
    assert client.get("/spaces", headers=bob.headers).json() == []
    assert client.get("/analyses", headers=bob.headers).json() == []
    assert client.get("/settings/providers", headers=bob.headers).json() == []
    assert client.get("/batches/running", headers=bob.headers).json() == []
    assert client.get("/search?q=Jan", headers=bob.headers).json() == {
        "entities": [],
        "articles": [],
    }
    home = client.get("/home", headers=bob.headers)
    assert home.status_code == 200
    assert "Jan Kowalski" not in home.text and world["s"] not in home.text


def test_owner_sees_own_data_in_lists(client, world, alice):
    # Positive control for the test above: the same queries do find Alice's data.
    assert len(client.get("/batches/running", headers=alice.headers).json()) == 1
    hits = client.get("/search?q=Jan", headers=alice.headers).json()
    assert [e["name"] for e in hits["entities"]] == ["Jan Kowalski"]


def test_foreign_analysis_order_ignored(client, world, alice, bob):
    second = client.post(f"/spaces/{world['s']}/analyses", json={}, headers=alice.headers).json()
    mine = [a["id"] for a in client.get("/analyses", headers=alice.headers).json()]
    r = client.put("/analyses/order", json={"analysis_ids": mine[::-1]}, headers=bob.headers)
    assert r.status_code == 204
    assert [a["id"] for a in client.get("/analyses", headers=alice.headers).json()] == mine
    assert second["id"] in mine


def test_foreign_provider_cannot_be_changed_or_deleted(client, world, bob):
    path = f"/settings/providers/{world['p']}"
    body = {"name": "x", "base_url": "https://evil.example/v1", "model": "m"}
    assert client.put(path, json=body, headers=bob.headers).status_code == 404
    assert client.delete(path, headers=bob.headers).status_code == 404


def test_foreign_provider_cannot_be_used(client, world, bob, queued):
    r = client.post("/spaces", json={"name": "Boba"}, headers=bob.headers)
    upload = {"articles": [{"content": "Tekst."}], "provider": f"custom:{world['p']}"}
    r = client.post(f"/spaces/{r.json()['id']}/articles", json=upload, headers=bob.headers)
    assert r.status_code == 422


def test_foreign_job_events_404(client, world, bob):
    r = client.get(f"/jobs/{world['j']}/events", headers=bob.headers)
    assert (r.status_code, r.json()["detail"]) == (404, "Job not found")


def test_api_key_never_returned_and_encrypted_at_rest(client, world, alice):
    r = client.get("/settings/providers", headers=alice.headers)
    assert API_KEY not in r.text
    assert r.json()[0]["has_api_key"] is True
    stored = cypher("MATCH (p:LlmProvider) RETURN p.api_key_encrypted AS k")[0]["k"]
    assert stored != API_KEY
    assert decrypt(stored) == API_KEY


def test_user_without_server_models_gets_403(client, alice, space, queued):
    cypher("MATCH (u:User {id: $id}) SET u.server_models = false", id=alice.id)
    upload = {"articles": [{"content": "Tekst."}], "provider": "local"}
    r = client.post(f"/spaces/{space}/articles", json=upload, headers=alice.headers)
    assert r.status_code == 403
    assert queued == []
