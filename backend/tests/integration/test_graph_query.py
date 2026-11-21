"""Pattern queries on the graph from sample_graph.py:

Jan ─GRA_W→ Inter ←GRA_W─ Anna,  Jan ─ZNA→ Anna,  Ewa ─GRA_W→ Milan ─RYWAL→ Inter
"""

import pytest

from db.access.scopes import SpaceScope
from db.driver import get_sync_driver
from db.graph.pattern.compile import compile_pattern
from schemas.query import GraphPattern
from tests.integration.conftest import cypher
from tests.integration.sample_graph import ARTICLE_A, ARTICLE_B, ARTICLE_C
from tests.integration.test_every_query import _FULL_SCANS, _operators


@pytest.fixture
def ids(space, extract) -> dict:
    extract(space, *ARTICLE_A, url="https://x.pl/a")
    extract(space, *ARTICLE_B, url="https://x.pl/b")
    rows = cypher("MATCH (n:Entity {space_id: $s}) RETURN n.name AS name, n.id AS id", s=space)
    return {r["name"]: r["id"] for r in rows}


@pytest.fixture
def ask(client, alice, space):
    def call(nodes: list[dict], edges: list[dict] | None = None, status: int = 200) -> dict:
        body = {"nodes": nodes, "edges": edges or []}
        r = client.post(f"/spaces/{space}/graph/query", json=body, headers=alice.headers)
        assert r.status_code == status, r.text
        return r.json()

    return call


def found(result: dict, key: str) -> list[str]:
    names = {n["id"]: n["name"] for n in result["nodes"]}
    return sorted(names[m[key]] for m in result["matches"])


def test_club_both_players_play_in(ask, ids):
    result = ask(
        [
            {"key": "a", "ids": [ids["Jan"]]},
            {"key": "b", "ids": [ids["Anna"]]},
            {"key": "k", "label": "KLUB"},
        ],
        [
            {"source": "a", "target": "k", "type": "GRA_W", "direction": "out"},
            {"source": "b", "target": "k", "type": "GRA_W", "direction": "out"},
        ],
    )
    assert found(result, "k") == ["Inter"]
    assert result["counts"] == {"k": 1}
    # The Cypher comes with its parameters, but never the space it was scoped to.
    assert result["params"]["a_ids"] == [ids["Jan"]] and "space_id" not in result["params"]
    assert sorted(e["type"] for e in result["edges"]) == ["GRA_W", "GRA_W"]


def test_people_of_two_clubs_when_nobody_plays_in_both(ask, ids):
    result = ask(
        [
            {"key": "a", "ids": [ids["Inter"]]},
            {"key": "b", "ids": [ids["Milan"]]},
            {"key": "o", "label": "OSOBA"},
        ],
        [
            {"source": "o", "target": "a", "type": "GRA_W", "direction": "out"},
            {"source": "o", "target": "b", "type": "GRA_W", "direction": "out"},
        ],
    )
    assert result["matches"] == []


def test_known_node_with_several_ids_matches_any_of_them(ask, ids):
    result = ask(
        [{"key": "a", "ids": [ids["Inter"], ids["Milan"]]}, {"key": "o", "label": "OSOBA"}],
        [{"source": "o", "target": "a", "type": "GRA_W", "direction": "out"}],
    )
    assert found(result, "o") == ["Anna", "Ewa", "Jan"]


def test_degree_condition_without_known_nodes(ask, ids):
    assert found(ask([{"key": "k", "label": "KLUB", "min_degree": 1}]), "k") == ["Inter", "Milan"]
    assert found(ask([{"key": "k", "label": "KLUB", "min_degree": 2}]), "k") == ["Inter"]


def test_longer_link_reaches_further(ask, ids):
    nodes = [{"key": "a", "ids": [ids["Jan"]]}, {"key": "k", "label": "KLUB"}]
    near = ask(nodes, [{"source": "a", "target": "k"}])
    far = ask(nodes, [{"source": "a", "target": "k", "max_hops": 2}])
    assert found(near, "k") == ["Inter"]
    assert found(far, "k") == ["Inter", "Milan"]
    # The way to Milan runs through Inter, which comes back to be drawn.
    assert "Inter" in {n["name"] for n in far["nodes"]}


def test_direction_is_seen_from_the_source(ask, ids):
    nodes = [{"key": "a", "ids": [ids["Inter"]]}, {"key": "x"}]
    incoming = ask(nodes, [{"source": "a", "target": "x", "direction": "in"}])
    outgoing = ask(nodes, [{"source": "a", "target": "x", "direction": "out"}])
    assert found(incoming, "x") == ["Anna", "Jan", "Milan"]
    assert outgoing["matches"] == []


def test_name_condition(ask, ids):
    assert found(ask([{"key": "o", "label": "OSOBA", "name_contains": "an"}]), "o") == [
        "Anna",
        "Jan",
    ]


def test_link_that_must_not_exist(ask, ids):
    # Who plays somewhere and does not know Anna: Jan knows her, Anna is her.
    result = ask(
        [
            {"key": "o", "label": "OSOBA"},
            {"key": "k", "label": "KLUB"},
            {"key": "a", "ids": [ids["Anna"]]},
        ],
        [
            {"source": "o", "target": "k", "type": "GRA_W", "direction": "out"},
            {"source": "o", "target": "a", "type": "ZNA", "mode": "not"},
        ],
    )
    assert found(result, "o") == ["Ewa"]


def test_at_least_some_of_the_known_entities(ask, ids):
    clubs = {"key": "g", "ids": [ids["Inter"], ids["Milan"]]}
    person = {"key": "o", "label": "OSOBA"}
    direct = {"source": "o", "target": "g", "type": "GRA_W"}
    assert found(ask([clubs, person], [direct]), "o") == ["Anna", "Ewa", "Jan"]
    assert ask([clubs | {"at_least": 2}, person], [direct])["matches"] == []
    # Within two steps everyone reaches both clubs, through the rivalry.
    around = {"source": "o", "target": "g", "max_hops": 2}
    assert found(ask([clubs | {"at_least": 2}, person], [around]), "o") == ["Anna", "Ewa", "Jan"]


def test_optional_link_keeps_matches_without_it(ask, ids):
    result = ask(
        [
            {"key": "k", "ids": [ids["Inter"]]},
            {"key": "o", "label": "OSOBA"},
            {"key": "f", "label": "OSOBA"},
        ],
        [
            {"source": "o", "target": "k", "type": "GRA_W", "direction": "out"},
            {"source": "o", "target": "f", "type": "ZNA", "direction": "out", "mode": "optional"},
        ],
    )
    assert found(result, "o") == ["Anna", "Jan"]
    names = {n["id"]: n["name"] for n in result["nodes"]}
    known = {names[m["o"]]: m["f"] and names[m["f"]] for m in result["matches"]}
    assert known == {"Jan": "Anna", "Anna": None}
    assert result["counts"] == {"o": 2, "f": 1}


def test_mentioned_together_in_an_article(ask, ids):
    nodes = [{"key": "e", "ids": [ids["Ewa"]]}, {"key": "x"}]
    result = ask(nodes, [{"source": "e", "target": "x", "via": "articles"}])
    assert found(result, "x") == ["Inter", "Milan"]
    assert {e["type"] for e in result["edges"]} == {"WSPOMNIANE_RAZEM"}
    assert all(e["source"] == ids["Ewa"] for e in result["edges"])


def test_link_count_finds_who_played_for_two_clubs(ask, ids, space, extract):
    two_clubs = {"min": 2, "type": "GRA_W", "label": "KLUB"}
    person = {"key": "o", "label": "OSOBA", "link_count": two_clubs}
    assert ask([person])["matches"] == []
    extract(space, *ARTICLE_C, url="https://x.pl/c")
    result = ask([person])
    assert found(result, "o") == ["Jan"]
    # The answer brings the clubs it counted, linked to Jan.
    names = {n["id"]: n["name"] for n in result["nodes"]}
    assert {names[e["target"]] for e in result["edges"]} == {"Inter", "Milan"}
    # Without a relationship or a type, every link to another entity counts.
    assert found(ask([{"key": "o", "label": "OSOBA", "link_count": {"min": 3}}]), "o") == ["Jan"]


def test_link_count_ranks_the_most_counted_first(ask, ids, space, extract):
    extract(space, *ARTICLE_C, url="https://x.pl/c")
    clubs = {"key": "o", "label": "OSOBA", "link_count": {"min": 1, "label": "KLUB"}}
    result = ask([clubs])
    names = {n["id"]: n["name"] for n in result["nodes"]}
    assert names[result["matches"][0]["o"]] == "Jan"
    assert {names[i]: n for i, n in result["counted"]["o"].items()} == {
        "Jan": 2,
        "Anna": 1,
        "Ewa": 1,
    }


def test_within_keeps_answers_to_the_given_entities(client, alice, space, ids):
    body = {"nodes": [{"key": "o", "label": "OSOBA"}], "within": [ids["Jan"], ids["Inter"]]}
    r = client.post(f"/spaces/{space}/graph/query", json=body, headers=alice.headers)
    assert r.status_code == 200, r.text
    assert [n["name"] for n in r.json()["nodes"]] == ["Jan"]


def test_pages_follow_on_without_gaps(client, alice, space, ids):
    def page(skip: int) -> dict:
        body = {"nodes": [{"key": "x"}], "limit": 2, "skip": skip}
        r = client.post(f"/spaces/{space}/graph/query", json=body, headers=alice.headers)
        assert r.status_code == 200, r.text
        return r.json()

    first, second, third = page(0), page(2), page(4)
    seen = [m["x"] for p in (first, second, third) for m in p["matches"]]
    assert first["total"] == 5 and len(seen) == 5 and len(set(seen)) == 5
    # A page brings the entities it lists, not the whole answer's.
    assert {n["id"] for n in first["nodes"]} == {m["x"] for m in first["matches"]}


def test_malformed_pattern_is_422(ask, ids):
    ask([{"key": "a", "ids": [ids["Jan"]]}], status=422)


def test_schema_lists_types_and_links(client, alice, space, ids):
    r = client.get(f"/spaces/{space}/graph/schema", headers=alice.headers)
    assert r.status_code == 200
    schema = r.json()
    assert {(x["label"], x["count"]) for x in schema["labels"]} == {("OSOBA", 3), ("KLUB", 2)}
    assert ("OSOBA", "GRA_W", "KLUB", 3) in {
        (x["source"], x["type"], x["target"], x["count"]) for x in schema["relations"]
    }


def test_another_spaces_entities_match_nothing(client, alice, bob, extract, ask, ids):
    bobs = client.post("/spaces", json={"name": "Bob"}, headers=bob.headers).json()["id"]
    extract(bobs, *ARTICLE_A, url="https://bob.pl/a", user=bob)
    bobs_jan = cypher("MATCH (n:Entity {space_id: $s, name: 'Jan'}) RETURN n.id AS id", s=bobs)[0][
        "id"
    ]
    result = ask([{"key": "a", "ids": [bobs_jan]}, {"key": "x"}], [{"source": "a", "target": "x"}])
    assert result["matches"] == [] and result["nodes"] == []
    r = client.post(
        f"/spaces/{bobs}/graph/query",
        json={"nodes": [{"key": "x"}]},
        headers=alice.headers,
    )
    assert r.status_code == 404


@pytest.mark.parametrize(
    "shape",
    [
        {
            "nodes": [{"key": "a", "ids": ["x"]}, {"key": "k", "label": "KLUB"}],
            "edges": [{"source": "a", "target": "k"}],
        },
        {
            "nodes": [{"key": "a", "ids": ["x"]}, {"key": "k"}],
            "edges": [{"source": "a", "target": "k", "max_hops": 3}],
        },
        {"nodes": [{"key": "k", "label": "KLUB", "min_degree": 3}]},
        {"nodes": [{"key": "o", "label": "OSOBA", "link_count": {"min": 2, "label": "KLUB"}}]},
        {
            "nodes": [{"key": "k"}, {"key": "o", "label": "OSOBA"}],
            "edges": [{"source": "o", "target": "k", "type": "GRA_W"}],
        },
        {
            "nodes": [{"key": "a", "ids": ["x"]}, {"key": "k"}],
            "edges": [{"source": "a", "target": "k", "via": "articles"}],
        },
        {
            "nodes": [
                {"key": "a", "ids": ["x", "y"], "at_least": 2},
                {"key": "b", "ids": ["z"]},
                {"key": "k", "label": "KLUB"},
                {"key": "t"},
            ],
            "edges": [
                {"source": "k", "target": "a"},
                {"source": "k", "target": "b", "mode": "not"},
                {"source": "k", "target": "t", "mode": "optional"},
            ],
        },
    ],
)
def test_patterns_start_from_an_index(ids, space, alice, shape):
    query, params = compile_pattern(GraphPattern.model_validate(shape))
    params |= SpaceScope(space_id=space, owner_id=alice.id).params()
    with get_sync_driver().session() as session:
        plan = session.run("EXPLAIN " + query.text, params).consume().plan
    assert not set(_operators(plan)) & _FULL_SCANS
