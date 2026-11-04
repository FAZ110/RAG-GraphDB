"""Labels and relationship types from the LLM become Cypher identifiers, so they are checked
before any statement is built."""

import pytest

from db.graph.writer import build_statements
from db.json_validator import validate_graph_json

INJECTION = "A`]->(X) DETACH DELETE X//"


def node(id: str, label: str = "OSOBA", **props) -> dict:
    return {"id": id, "label": label, "properties": {"name": f"N{id}", **props}, "aliases": []}


def edge(type: str) -> dict:
    return {"source": "1", "target": "2", "type": type, "properties": {}, "evidence": []}


def test_injection_label_passes_the_json_check():
    # Why the writer's own check matters: the label is "uppercase" to str.isupper().
    graph = {"nodes": [{"id": "1", "label": INJECTION, "properties": {"name": "x"}}], "edges": []}
    assert validate_graph_json(graph).nodes[0].label == INJECTION


@pytest.mark.parametrize(
    "label", [INJECTION, "OSOBA X", "OSOBA-X", "osoba", "1OSOBA", "", "OSOBA`"]
)
def test_unsafe_label_rejected(label):
    with pytest.raises(ValueError, match="Unsafe label"):
        build_statements([node("1", label)], [], "s1", "a1")


@pytest.mark.parametrize("type_", [INJECTION, "ZNA`]->()", "ZNA X", "zna", "", "1ZNA"])
def test_unsafe_relationship_type_rejected(type_):
    with pytest.raises(ValueError, match="Unsafe"):
        build_statements([node("1"), node("2")], [edge(type_)], "s1", "a1")


@pytest.mark.parametrize("label", ["OSOBA", "MIEJSCE_URODZENIA", "KLUB2", "MIĘDZYNARODOWA"])
def test_safe_labels_accepted(label):
    assert build_statements([node("1", label)], [], "s1", "a1")


def test_reserved_properties_from_llm_are_dropped():
    hijack = node("1")
    hijack["properties"] |= {
        "space_id": "cudza", "id": "przejete", "embedding": [1.0], "label": "X", "rola": "Prezes"
    }  # fmt: skip
    [(_, params)] = build_statements([hijack], [], "s1", "a1")
    assert params["space_id"] == "s1"
    assert params["label"] == "OSOBA"
    assert params["props"] == {"name": "N1", "rola": "Prezes"}
