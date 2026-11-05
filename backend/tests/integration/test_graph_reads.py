"""The analysis tools' reads, on the graph from sample_graph.py built by real extraction."""

import pytest

from tests.integration.conftest import cypher
from tests.integration.sample_graph import ARTICLE_A, ARTICLE_B


@pytest.fixture
def graph(space, extract) -> dict:
    """Extract both articles; returns entity ids by name and article ids by letter."""
    articles = {
        letter: extract(space, text, extracted, f"https://x.pl/{letter}", f"Artykuł {letter}")
        for letter, (text, extracted) in {"A": ARTICLE_A, "B": ARTICLE_B}.items()
    }
    rows = cypher("MATCH (n:Entity {space_id: $s}) RETURN n.name AS name, n.id AS id", s=space)
    return {"ids": {r["name"]: r["id"] for r in rows}, "articles": articles}


@pytest.fixture
def api(client, alice, space):
    def call(method: str, path: str, **kwargs):
        r = client.request(method, f"/spaces/{space}/graph{path}", headers=alice.headers, **kwargs)
        assert r.status_code == 200, r.text
        return r.json()

    return call


def names(nodes: list[dict]) -> list[str]:
    return sorted(n["name"] for n in nodes)


def test_same_entity_from_two_articles_is_one_node(graph):
    assert sorted(graph["ids"]) == ["Anna", "Ewa", "Inter", "Jan", "Milan"]


def test_top_graph_and_overview(api, graph):
    top = api("GET", "?limit=25")
    assert top["total_nodes"] == 5
    overview = api("GET", "/overview")
    assert names(overview["nodes"]) == ["Anna", "Ewa", "Inter", "Jan", "Milan"]
    assert len(overview["edges"]) == 5
    assert overview["truncated"] is False


def test_top_graph_respects_limit(api, graph):
    top = api("GET", "?limit=2")
    assert len(top["nodes"]) == 2
    assert top["total_nodes"] == 5


def test_node_details_count_degree(api, graph):
    inter = api("GET", f"/nodes/{graph['ids']['Inter']}")
    assert (inter["name"], inter["label"], inter["degree"]) == ("Inter", "KLUB", 3)


def test_missing_node_404(client, alice, space, graph):
    r = client.get(f"/spaces/{space}/graph/nodes/nie-ma", headers=alice.headers)
    assert r.status_code == 404


def test_neighbours_and_their_filters(api, graph):
    inter = graph["ids"]["Inter"]
    assert names(api("GET", f"/nodes/{inter}/neighbours")["nodes"]) == ["Anna", "Jan", "Milan"]
    assert names(api("GET", f"/nodes/{inter}/neighbours?type=GRA_W")["nodes"]) == ["Anna", "Jan"]
    assert names(api("GET", f"/nodes/{inter}/neighbours?label=KLUB")["nodes"]) == ["Milan"]
    assert api("GET", f"/nodes/{inter}/neighbours?direction=out")["nodes"] == []


def test_relation_groups_count_neighbours(api, graph):
    groups = api("GET", f"/nodes/{graph['ids']['Inter']}/relations")
    counted = sorted((g["direction"], g["type"], g["label"], g["count"]) for g in groups)
    assert counted == [("in", "GRA_W", "OSOBA", 2), ("in", "RYWAL", "KLUB", 1)]


def test_entities_of_type_best_connected_first(api, graph):
    page = api("GET", "/nodes?label=OSOBA")
    assert page["total"] == 3
    assert page["nodes"][-1]["name"] == "Ewa"
    second = api("GET", "/nodes?label=OSOBA&limit=1&offset=2")
    assert [n["name"] for n in second["nodes"]] == ["Ewa"]


def test_subgraph_has_only_edges_among_the_picked(api, graph):
    ids = graph["ids"]
    sub = api("POST", "/subgraph", json={"ids": [ids["Jan"], ids["Inter"], ids["Ewa"]]})
    assert names(sub["nodes"]) == ["Ewa", "Inter", "Jan"]
    assert [e["type"] for e in sub["edges"]] == ["GRA_W"]


def test_common_neighbours(api, graph):
    ids = graph["ids"]
    common = api("POST", "/common", json={"ids": [ids["Jan"], ids["Anna"]]})
    assert names(common["nodes"]) == ["Inter"]
    # `shared` names which of the given entities the result is linked to.
    assert sorted(common["nodes"][0]["shared"]) == sorted([ids["Jan"], ids["Anna"]])
    assert common["total"] == 1
    assert len(common["edges"]) == 2


def test_common_neighbours_of_one_type_and_partial(api, graph):
    ids = graph["ids"]
    pair = [ids["Jan"], ids["Milan"]]
    assert names(api("POST", "/common", json={"ids": pair})["nodes"]) == ["Inter"]
    assert api("POST", "/common", json={"ids": pair, "label": "OSOBA"})["nodes"] == []
    # Linked to at least one of them: Anna (to Jan), Ewa (to Milan) and Inter (to both).
    partial = api("POST", "/common", json={"ids": pair, "min_shared": 1})
    assert names(partial["nodes"]) == ["Anna", "Ewa", "Inter"]


def test_common_needs_two_entities(client, alice, space, graph):
    body = {"ids": [graph["ids"]["Jan"]]}
    r = client.post(f"/spaces/{space}/graph/common", json=body, headers=alice.headers)
    assert r.status_code == 422


def test_shortest_path(api, graph):
    ids = graph["ids"]
    found = api("POST", "/paths", json={"source_id": ids["Jan"], "target_id": ids["Milan"]})
    assert [[_name(graph, i) for i in p["node_ids"]] for p in found["paths"]] == [
        ["Jan", "Inter", "Milan"]
    ]
    assert names(found["nodes"]) == ["Inter", "Jan", "Milan"]
    assert sorted(e["type"] for e in found["paths"][0]["edges"]) == ["GRA_W", "RYWAL"]


def test_paths_ignore_direction_and_respect_max_length(api, graph):
    ids = graph["ids"]
    body = {"source_id": ids["Ewa"], "target_id": ids["Anna"]}
    [path] = api("POST", "/paths", json=body)["paths"]
    assert [_name(graph, i) for i in path["node_ids"]] == ["Ewa", "Milan", "Inter", "Anna"]
    assert api("POST", "/paths", json={**body, "max_length": 2})["paths"] == []


def test_several_shortest_paths(api, graph):
    ids = graph["ids"]
    body = {"source_id": ids["Jan"], "target_id": ids["Anna"], "k": 2}
    routes = [
        [_name(graph, i) for i in p["node_ids"]] for p in api("POST", "/paths", json=body)["paths"]
    ]
    assert routes == [["Jan", "Anna"], ["Jan", "Inter", "Anna"]]


def test_path_to_itself_rejected(client, alice, space, graph):
    jan = graph["ids"]["Jan"]
    body = {"source_id": jan, "target_id": jan}
    r = client.post(f"/spaces/{space}/graph/paths", json=body, headers=alice.headers)
    assert r.status_code == 422


def _name(graph: dict, node_id: str) -> str:
    return next(name for name, i in graph["ids"].items() if i == node_id)


def test_sources_rank_articles_mentioning_most(api, graph):
    ids = graph["ids"]
    found = api("POST", "/sources", json={"ids": [ids["Jan"], ids["Inter"]]})
    assert [s["title"] for s in found] == ["Artykuł A", "Artykuł B"]
    only_ewa = api("POST", "/sources", json={"ids": [ids["Ewa"]]})
    assert [s["title"] for s in only_ewa] == ["Artykuł B"]


def test_node_sources_quote_the_sentence(api, graph):
    [source] = api("GET", f"/nodes/{graph['ids']['Ewa']}/sources")
    assert source["article_id"] == graph["articles"]["B"]
    assert "Ewa gra w Milan." in str(source["quotes"])


def test_edge_sources_quote_the_sentence(api, graph):
    edges = api("GET", f"/nodes/{graph['ids']['Jan']}/neighbours")["edges"]
    zna = next(e for e in edges if e["type"] == "ZNA")
    [source] = api("GET", f"/edges/{zna['id']}/sources")
    assert source["article_id"] == graph["articles"]["A"]
    assert "Jan zna Annę od lat." in str(source["quotes"])


def test_search_finds_entity_by_meaning(api, graph):
    # The fake embedder gives equal vectors for equal texts: the query is Inter's own text.
    hits = api("GET", "/search?q=KLUB: Inter&top_k=3")
    assert hits[0]["name"] == "Inter"
    assert len(hits) <= 3


def test_fresh_lists_newest_entities(api, graph):
    fresh = api("GET", "/fresh?limit=10")
    assert sorted(n["name"] for n in fresh) == ["Anna", "Ewa", "Inter", "Jan", "Milan"]
