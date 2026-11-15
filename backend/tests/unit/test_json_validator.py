import pytest
from pydantic import ValidationError

from db.json_validator import only_labels, validate_graph_json


def graph(node: dict, edges: list | None = None) -> dict:
    return {"nodes": [{"id": "1", "label": "OSOBA", "properties": {"name": "Jan"}, **node}],
            "edges": edges or []}  # fmt: skip


def test_valid_graph_normalises_type_aliases_and_evidence():
    g = validate_graph_json(
        graph({"type": " osoba ", "aliases": ["Jan", " JK ", "JK"], "evidence": 3})
    )
    n = g.nodes[0]
    assert (n.type, n.aliases, n.evidence) == ("OSOBA", ["JK"], ["3"])


def test_unknown_type_becomes_none():
    assert validate_graph_json(graph({"type": "KOT"})).nodes[0].type is None


def test_alias_given_as_string_becomes_list():
    assert validate_graph_json(graph({"aliases": "JK"})).nodes[0].aliases == ["JK"]


def test_missing_name_taken_from_first_alias():
    n = validate_graph_json(
        graph({"properties": {}, "aliases": [" ", "Ewa Pajor", "Pajor"]})
    ).nodes[0]
    assert (n.properties["name"], n.aliases) == ("Ewa Pajor", ["Pajor"])


@pytest.mark.parametrize(
    ("node", "label"),
    [
        ({"label": "BUDIMEX_WSCHOD", "type": "ORGANIZACJA", "properties": {"name": "Budimex-Wschód"}},
         "ORGANIZACJA"),
        ({"label": "POLITECHNIKA_ŚLĄSKA", "properties": {"name": "Politechnika Śląska"}}, "POJĘCIE"),
        ({"label": "UCZELNIA", "properties": {"name": "Politechnika Śląska"}}, "UCZELNIA"),
    ],
    ids=["name-as-label-takes-type", "name-as-label-without-type", "kind-stays"],
)  # fmt: skip
def test_label_that_is_the_entitys_name_becomes_its_type(node, label):
    assert validate_graph_json(graph(node)).nodes[0].label == label


def test_only_labels_drops_other_nodes_with_their_edges():
    g = validate_graph_json({
        "nodes": [
            {"id": "1", "label": "OSOBA", "properties": {"name": "Jan"}},
            {"id": "2", "label": "MIEJSCE", "properties": {"name": "Lublin"}},
            {"id": "3", "label": "OSOBA", "properties": {"name": "Ewa"}},
        ],
        "edges": [
            {"source": "1", "target": "2", "type": "MIESZKA_W"},
            {"source": "1", "target": "3", "type": "ZNA"},
        ],
    })  # fmt: skip
    kept = only_labels(g, ["OSOBA"])
    assert [n.id for n in kept.nodes] == ["1", "3"]
    assert [e.type for e in kept.edges] == ["ZNA"]


@pytest.mark.parametrize(
    "bad",
    [
        graph({"label": "osoba"}),
        graph({"properties": {"name": " "}}),
        graph({}, [{"source": "1", "target": "2", "type": "ZNA"}]),
    ],
    ids=["lowercase-label", "blank-name", "edge-to-unknown-node"],
)
def test_invalid_graph_raises(bad):
    with pytest.raises(ValidationError):
        validate_graph_json(bad)
