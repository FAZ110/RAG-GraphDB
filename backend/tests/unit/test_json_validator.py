import pytest
from pydantic import ValidationError

from db.json_validator import validate_graph_json


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
