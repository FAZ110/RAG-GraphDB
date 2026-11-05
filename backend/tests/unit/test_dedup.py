import pytest

from services.dedup import (
    MatchConfig,
    cosine,
    jaro_winkler,
    name_similarity,
    normalize_name,
    resolve_batch,
)

CFG = MatchConfig(threshold=0.75, name_min_score=0.5, lexical_min=0.85, suggest_min=0.5)


def node(id: str, name: str, label: str = "OSOBA", type: str | None = "OSOBA") -> dict:
    return {
        "id": id,
        "label": label,
        "properties": {"name": name},
        "aliases": [],
        "type": type,
        "evidence": [],
    }


def edge(source: str, target: str, type: str = "ZNA") -> dict:
    return {"source": source, "target": target, "type": type, "properties": {}, "evidence": []}


def test_normalize_name_strips_diacritics_case_and_spaces():
    assert normalize_name("  Łódź   KALISKA ") == "lodz kaliska"


def test_cosine_basic():
    assert cosine([1, 0], [0, 1]) == 0
    assert cosine([1, 1], [2, 2]) == pytest.approx(1)


def test_cosine_of_zero_vector_is_zero():
    assert cosine([0, 0], [1, 1]) == 0


def test_jaro_winkler_known_value():
    assert jaro_winkler("martha", "marhta") == pytest.approx(0.9611, abs=1e-4)


def test_name_similarity_no_fuzzy_subset():
    # "Niemcy" must not join "Puchar Niemiec" through a fuzzy match of one word.
    assert name_similarity("Niemcy", "Puchar Niemiec") == 0.0


def test_name_similarity_ignores_diacritics_and_case():
    assert name_similarity("Jan Kowalski", "JAN KOWALSKI") == 1.0


def test_resolve_batch_merges_same_name_and_rewires_edges():
    nodes = [
        node("a", "Jan Kowalski"),
        node("b", "jan kowalski"),
        node("c", "Warszawa", "MIEJSCE", "MIEJSCE"),
    ]
    vectors = {"a": [1, 0, 0], "b": [1, 0, 0], "c": [0, 1, 0]}
    log: list[dict] = []
    merged, edges = resolve_batch(nodes, [edge("b", "c")], vectors, CFG, log)

    assert len(merged) == 2
    jan = next(n for n in merged if n["label"] == "OSOBA")
    assert edges == [{**edge(jan["id"], "c")}]
    assert [e["reason"] for e in log] == ["name"]


def test_resolve_batch_keeps_different_types_apart():
    nodes = [
        node("a", "Mecz Juventus – Udinese", "WYDARZENIE", "WYDARZENIE"),
        node("b", "Udinese", "ORGANIZACJA", "ORGANIZACJA"),
    ]
    vectors = {"a": [1, 0], "b": [1, 0]}
    merged, _ = resolve_batch(nodes, [], vectors, CFG)
    assert len(merged) == 2


def test_resolve_batch_does_not_merge_far_embeddings_with_other_names():
    nodes = [node("a", "Jan Kowalski"), node("b", "Anna Nowak")]
    merged, _ = resolve_batch(nodes, [], {"a": [1, 0], "b": [0, 1]}, CFG)
    assert len(merged) == 2


def test_resolve_batch_drops_self_loop_after_merge():
    nodes = [node("a", "Jan Kowalski"), node("b", "Jan Kowalski")]
    merged, edges = resolve_batch(nodes, [edge("a", "b")], {"a": [1, 0], "b": [1, 0]}, CFG)
    assert len(merged) == 1
    assert edges == []
