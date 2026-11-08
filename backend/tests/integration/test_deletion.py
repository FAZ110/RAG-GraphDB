"""Deleting removes exactly what it should: everything the deleted thing owns, nothing else."""

import pytest

from tests.integration.conftest import cypher
from tests.integration.sample_graph import ARTICLE_A, ARTICLE_B


def count(label: str, space: str) -> int:
    return cypher(f"MATCH (n:{label} {{space_id: $s}}) RETURN count(n) AS c", s=space)[0]["c"]


def entity_names(space: str) -> list[str]:
    rows = cypher("MATCH (n:Entity {space_id: $s}) RETURN n.name AS n ORDER BY n", s=space)
    return [r["n"] for r in rows]


def relation_types(space: str) -> list[str]:
    rows = cypher(
        "MATCH (:Entity {space_id: $s})-[r]->(:Entity) RETURN type(r) AS t ORDER BY t", s=space
    )
    return [r["t"] for r in rows]


@pytest.fixture
def filled(client, alice, extract):
    """Two spaces of Alice: `main` with both sample articles, an analysis and a duplicate
    suggestion; `other` with article A only."""

    def make_space(name: str) -> str:
        r = client.post("/spaces", json={"name": name}, headers=alice.headers)
        assert r.status_code == 201
        return r.json()["id"]

    main, other = make_space("Główna"), make_space("Inna")
    a = extract(main, *ARTICLE_A, "https://x.pl/a", "A")
    b = extract(main, *ARTICLE_B, "https://x.pl/b", "B")
    extract(other, *ARTICLE_A, "https://x.pl/a", "A")
    assert client.post(f"/spaces/{main}/analyses", json={}, headers=alice.headers).is_success
    cypher(
        "CREATE (:DuplicateSuggestion {id: 'sug', space_id: $s, rejected: false, score: 0.9,"
        " lexical: 0.9, a_label: 'OSOBA', a_name: 'Jan', b_label: 'OSOBA', b_name: 'Anna'})",
        s=main,
    )
    return {"main": main, "other": other, "a": a, "b": b}


def test_delete_space_removes_all_it_holds_and_nothing_else(client, alice, filled):
    main, other = filled["main"], filled["other"]
    assert client.delete(f"/spaces/{main}", headers=alice.headers).status_code == 204

    assert client.get(f"/spaces/{main}", headers=alice.headers).status_code == 404
    for label in ("Article", "Entity", "Analysis", "DuplicateSuggestion"):
        assert count(label, main) == 0, label
    assert cypher("MATCH (s:Space {id: $s}) RETURN s", s=main) == []

    assert entity_names(other) == ["Anna", "Inter", "Jan"]
    assert count("Article", other) == 1


def test_clear_space_keeps_the_space(client, alice, filled):
    main = filled["main"]
    assert client.delete(f"/spaces/{main}/articles", headers=alice.headers).status_code == 204
    assert client.get(f"/spaces/{main}", headers=alice.headers).status_code == 200
    assert count("Article", main) == 0
    assert count("Entity", main) == 0
    assert count("Entity", filled["other"]) == 3


def test_delete_article_takes_back_only_its_share_of_the_graph(client, alice, filled):
    main = filled["main"]
    r = client.delete(f"/spaces/{main}/articles/{filled['a']}", headers=alice.headers)
    assert r.status_code == 204

    # Jan and Anna came only from A; Inter is still mentioned by B.
    assert entity_names(main) == ["Ewa", "Inter", "Milan"]
    assert relation_types(main) == ["GRA_W", "RYWAL"]
    sources = cypher(
        "MATCH (a:Article)-[:MENTIONS]->(:Entity {name: 'Inter', space_id: $s}) RETURN a.id AS id",
        s=main,
    )
    assert [s["id"] for s in sources] == [filled["b"]]


def test_delete_article_keeps_entities_made_by_hand(client, alice, filled):
    main = filled["main"]
    jan = cypher("MATCH (n:Entity {name: 'Jan', space_id: $s}) RETURN n.id AS id", s=main)[0]
    path = f"/spaces/{main}/graph/nodes/{jan['id']}"
    assert client.patch(
        path, json={"description": "Opis od ręki"}, headers=alice.headers
    ).is_success

    client.delete(f"/spaces/{main}/articles/{filled['a']}", headers=alice.headers)
    assert "Jan" in entity_names(main)


def test_article_being_extracted_cannot_be_deleted(client, alice, filled):
    main = filled["main"]
    cypher("MATCH (a:Article {id: $id}) SET a.status = 'processing'", id=filled["a"])

    r = client.delete(f"/spaces/{main}/articles/{filled['a']}", headers=alice.headers)
    assert r.status_code == 409
    many = client.post(
        f"/spaces/{main}/articles/delete",
        json={"article_ids": [filled["a"], filled["b"]]},
        headers=alice.headers,
    )
    assert many.json() == {"deleted": [filled["b"]], "processing": [filled["a"]]}
    assert count("Article", main) == 1


def test_delete_missing_article_404(client, alice, filled):
    r = client.delete(f"/spaces/{filled['main']}/articles/nie-ma", headers=alice.headers)
    assert r.status_code == 404


def test_admin_deletes_user_with_all_their_data(client, admin, alice, bob, filled, extract):
    bobs = client.post("/spaces", json={"name": "Boba"}, headers=bob.headers).json()["id"]
    extract(bobs, *ARTICLE_B, "https://x.pl/b", "B", user=bob)
    client.post(
        "/settings/providers",
        json={"name": "M", "base_url": "https://llm.example/v1", "model": "m", "api_key": "k"},
        headers=alice.headers,
    )

    assert client.delete(f"/admin/users/{alice.id}", headers=admin.headers).status_code == 204

    assert cypher("MATCH (u:User {id: $id}) RETURN u", id=alice.id) == []
    assert cypher("MATCH (s:Space {owner_id: $id}) RETURN s", id=alice.id) == []
    for space in (filled["main"], filled["other"]):
        assert count("Article", space) == count("Entity", space) == 0
    assert cypher("MATCH (p:LlmProvider) RETURN p") == []
    assert client.get("/auth/me", headers=alice.headers).status_code == 401
    # Bob's data is untouched.
    assert entity_names(bobs) == ["Ewa", "Inter", "Milan"]
    assert client.get("/auth/me", headers=bob.headers).status_code == 200


def test_admin_cannot_delete_self(client, admin):
    assert client.delete(f"/admin/users/{admin.id}", headers=admin.headers).status_code >= 400
    assert client.get("/auth/me", headers=admin.headers).status_code == 200


def test_admin_signs_user_out_everywhere(client, admin, alice):
    r = client.post(f"/admin/users/{alice.id}/logout", headers=admin.headers)
    assert r.status_code == 204
    assert client.get("/auth/me", headers=alice.headers).status_code == 401


def test_role_change_ends_sessions(client, admin, alice):
    r = client.patch(f"/admin/users/{alice.id}", json={"role": "admin"}, headers=admin.headers)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    assert client.get("/auth/me", headers=alice.headers).status_code == 401


def test_admin_actions_on_missing_user_404(client, admin):
    assert client.delete("/admin/users/nie-ma", headers=admin.headers).status_code == 404
    assert client.post("/admin/users/nie-ma/logout", headers=admin.headers).status_code == 404
    r = client.patch("/admin/users/nie-ma", json={"server_models": False}, headers=admin.headers)
    assert r.status_code == 404
