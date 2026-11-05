from tests.integration.conftest import cypher


def node(client, user, space, name: str, label: str = "OSOBA") -> str:
    r = client.post(
        f"/spaces/{space}/graph/nodes", json={"name": name, "label": label}, headers=user.headers
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def edge(client, user, space, source: str, target: str, type: str = "ZNA") -> str:
    body = {"source_id": source, "target_id": target, "type": type}
    r = client.post(f"/spaces/{space}/graph/edges", json=body, headers=user.headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def names(space: str) -> list[str]:
    rows = cypher("MATCH (n:Entity {space_id: $s}) RETURN n.name AS n ORDER BY n", s=space)
    return [r["n"] for r in rows]


def test_create_and_rename_node(client, alice, space):
    jan = node(client, alice, space, "Jan Kowalski")
    path = f"/spaces/{space}/graph/nodes/{jan}"
    assert client.patch(path, json={"name": "Jan K."}, headers=alice.headers).status_code == 200
    assert names(space) == ["Jan K."]


def test_duplicate_name_and_label_409(client, alice, space):
    node(client, alice, space, "Jan Kowalski")
    r = client.post(
        f"/spaces/{space}/graph/nodes",
        json={"name": "Jan Kowalski", "label": "OSOBA"},
        headers=alice.headers,
    )
    assert r.status_code == 409


def test_merge_nodes_moves_edges_and_keeps_alias(client, alice, space):
    a = node(client, alice, space, "Jan Kowalski")
    b = node(client, alice, space, "J. Kowalski")
    c = node(client, alice, space, "Warszawa", "MIEJSCE")
    edge(client, alice, space, b, c, "MIESZKA_W")

    body = {"keep_id": a, "merge_id": b}
    r = client.post(f"/spaces/{space}/graph/nodes/merge", json=body, headers=alice.headers)
    assert r.status_code == 200, r.text

    assert client.get(f"/spaces/{space}/graph/nodes/{b}", headers=alice.headers).status_code == 404
    kept = cypher(
        "MATCH (a:Entity {id: $a})-[:MIESZKA_W]->(c:Entity {id: $c}) RETURN a.aliases AS al",
        a=a,
        c=c,
    )
    assert len(kept) == 1
    assert "J. Kowalski" in kept[0]["al"]


def test_merge_into_itself_rejected(client, alice, space):
    a = node(client, alice, space, "Jan Kowalski")
    body = {"keep_id": a, "merge_id": a}
    r = client.post(f"/spaces/{space}/graph/nodes/merge", json=body, headers=alice.headers)
    assert r.status_code in (404, 422)
    assert names(space) == ["Jan Kowalski"]


def test_delete_node_removes_its_edges(client, alice, space):
    a = node(client, alice, space, "Jan Kowalski")
    c = node(client, alice, space, "Warszawa", "MIEJSCE")
    edge(client, alice, space, a, c)
    path = f"/spaces/{space}/graph/nodes/{a}"
    assert client.delete(path, headers=alice.headers).status_code == 204
    assert names(space) == ["Warszawa"]
    assert cypher("MATCH ()-[r]->() WHERE type(r) = 'ZNA' RETURN r") == []


def test_edge_to_missing_node_404(client, alice, space):
    a = node(client, alice, space, "Jan Kowalski")
    body = {"source_id": a, "target_id": "nie-ma", "type": "ZNA"}
    r = client.post(f"/spaces/{space}/graph/edges", json=body, headers=alice.headers)
    assert r.status_code == 404


def test_reject_duplicate_suggestion_hides_it(client, alice, space):
    node(client, alice, space, "Jan Kowalski")
    node(client, alice, space, "Jan Kowalsky")
    cypher(
        "CREATE (:DuplicateSuggestion {id: 'sug', space_id: $s, rejected: false, score: 0.99,"
        " lexical: 0.95, a_label: 'OSOBA', a_name: 'Jan Kowalski',"
        " b_label: 'OSOBA', b_name: 'Jan Kowalsky'})",
        s=space,
    )
    path = f"/spaces/{space}/graph/duplicates"
    assert [d["id"] for d in client.get(path, headers=alice.headers).json()] == ["sug"]

    assert client.post(f"{path}/sug/reject", headers=alice.headers).status_code == 204
    assert client.get(path, headers=alice.headers).json() == []
