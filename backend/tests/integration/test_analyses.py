import pytest


@pytest.fixture
def entity_ids(client, alice, space) -> list[str]:
    ids = []
    for name in ("Jan Kowalski", "Anna Nowak"):
        r = client.post(
            f"/spaces/{space}/graph/nodes", json={"name": name, "label": "OSOBA"},
            headers=alice.headers,
        )  # fmt: skip
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])
    return ids


def create(client, user, space, **body) -> dict:
    r = client.post(f"/spaces/{space}/analyses", json=body, headers=user.headers)
    assert r.status_code == 201, r.text
    return r.json()


def canvas(client, user, space, analysis_id, **changes):
    return client.patch(
        f"/spaces/{space}/analyses/{analysis_id}/canvas", json=changes, headers=user.headers
    )


def test_create_rename_list_delete(client, alice, space):
    analysis = create(client, alice, space)
    assert analysis["name"] == "Nowa analiza"
    path = f"/spaces/{space}/analyses/{analysis['id']}"

    assert client.patch(path, json={"name": "Śledztwo"}, headers=alice.headers).status_code == 204
    listed = client.get("/analyses", headers=alice.headers).json()
    assert [(a["name"], a["space_name"]) for a in listed] == [("Śledztwo", "Przestrzeń")]

    assert client.delete(path, headers=alice.headers).status_code == 204
    assert client.get(path, headers=alice.headers).status_code == 404


def test_canvas_save_places_entities_and_bumps_revision(client, alice, space, entity_ids):
    analysis = create(client, alice, space)
    place = [{"id": entity_ids[0], "x": 10, "y": 20}]
    r = canvas(client, alice, space, analysis["id"], revision=analysis["revision"], place=place)
    assert r.status_code == 200, r.text
    assert r.json()["revision"] > analysis["revision"]

    saved = client.get(f"/spaces/{space}/analyses/{analysis['id']}", headers=alice.headers).json()
    assert [(e["id"], e["x"], e["y"]) for e in saved["entities"]] == [(entity_ids[0], 10, 20)]


def test_canvas_stale_revision_409_and_data_kept(client, alice, space, entity_ids):
    analysis = create(client, alice, space)
    stale = analysis["revision"]
    first = [{"id": entity_ids[0], "x": 1, "y": 1}]
    second = [{"id": entity_ids[1], "x": 2, "y": 2}]

    assert (
        canvas(client, alice, space, analysis["id"], revision=stale, place=first).status_code == 200
    )
    r = canvas(client, alice, space, analysis["id"], revision=stale, place=second)
    assert r.status_code == 409

    saved = client.get(f"/spaces/{space}/analyses/{analysis['id']}", headers=alice.headers).json()
    assert [e["id"] for e in saved["entities"]] == [entity_ids[0]]


def test_canvas_rejects_same_entity_twice(client, alice, space, entity_ids):
    analysis = create(client, alice, space)
    place = [{"id": entity_ids[0], "x": 1, "y": 1}, {"id": entity_ids[0], "x": 2, "y": 2}]
    r = canvas(client, alice, space, analysis["id"], revision=analysis["revision"], place=place)
    assert r.status_code == 422


def test_reorder_analyses(client, alice, space):
    ids = [create(client, alice, space, name=f"A{i}")["id"] for i in range(3)]
    r = client.put("/analyses/order", json={"analysis_ids": ids[::-1]}, headers=alice.headers)
    assert r.status_code == 204
    assert [a["id"] for a in client.get("/analyses", headers=alice.headers).json()] == ids[::-1]


def test_empty_name_rejected(client, alice, space):
    analysis = create(client, alice, space)
    path = f"/spaces/{space}/analyses/{analysis['id']}"
    assert client.patch(path, json={"name": "  "}, headers=alice.headers).status_code == 422
