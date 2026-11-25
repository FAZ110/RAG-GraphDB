import re

import pytest
from pydantic import ValidationError

from db.graph.pattern.compile import compile_pattern
from schemas.query import GraphPattern


def pattern(nodes: list[dict], edges: list[dict] | None = None) -> GraphPattern:
    return GraphPattern.model_validate({"nodes": nodes, "edges": edges or []})


TWO_PLAYERS_ONE_CLUB = pattern(
    [{"key": "a", "ids": ["jan"]}, {"key": "b", "ids": ["anna"]}, {"key": "k", "label": "KLUB"}],
    [
        {"source": "a", "target": "k", "type": "GRA_W", "direction": "out"},
        {"source": "b", "target": "k", "type": "GRA_W", "direction": "out"},
    ],
)


def test_every_node_where_it_first_appears_is_kept_to_the_space():
    query, _ = compile_pattern(TWO_PLAYERS_ONE_CLUB)
    introduced = re.findall(r"\((\w+):Entity \{([^}]*)\}\)", query.text)
    assert sorted(key for key, _ in introduced) == ["a", "b", "k"]
    assert all("space_id: $space_id" in props for _, props in introduced)
    assert query.kind == "space"


def test_known_nodes_are_matched_before_the_links():
    query, params = compile_pattern(TWO_PLAYERS_ONE_CLUB)
    lines = query.text.splitlines()
    assert lines[0].startswith("MATCH (a:Entity") and lines[1].startswith("MATCH (b:Entity")
    assert params["a_ids"] == ["jan"] and params["k_label"] == "KLUB"
    assert "-[:`GRA_W`]->(k:Entity" in query.text


def test_longer_links_go_through_entities_only():
    query, _ = compile_pattern(
        pattern(
            [{"key": "a", "ids": ["jan"]}, {"key": "k"}],
            [{"source": "a", "target": "k", "min_hops": 1, "max_hops": 3}],
        )
    )
    assert "((:Entity)-[]-(:Entity)){1,3}" in query.text


def test_sought_conditions_become_parameters():
    query, params = compile_pattern(
        pattern([{"key": "k", "label": "KLUB", "min_degree": 10, "name_contains": "Wis"}])
    )
    assert params["k_min_degree"] == 10 and params["k_name"] == "Wis"
    assert "Wis" not in query.text


def test_each_node_stands_for_a_different_entity():
    query, _ = compile_pattern(TWO_PLAYERS_ONE_CLUB)
    assert all(pair in query.text for pair in ("a <> b", "a <> k", "b <> k"))


def _players_of_one_club(*players: str, **changes: dict) -> GraphPattern:
    nodes = [{"key": p, "label": "OSOBA", **changes.get(p, {})} for p in players]
    edges = [{"source": p, "target": "k", "type": "GRA_W", "direction": "out"} for p in players]
    return pattern([*nodes, {"key": "k", "label": "KLUB"}], edges)


def test_sought_nodes_that_can_swap_take_their_entities_in_one_order():
    query, _ = compile_pattern(_players_of_one_club("a", "b"))
    assert "a.id < b.id" in query.text


def test_every_node_of_a_swappable_group_is_ordered_after_the_one_before():
    query, _ = compile_pattern(_players_of_one_club("a", "b", "c"))
    assert "a.id < b.id" in query.text and "b.id < c.id" in query.text


def test_sought_nodes_asked_for_differently_are_not_ordered():
    query, _ = compile_pattern(_players_of_one_club("a", "b", b={"name_contains": "an"}))
    assert ".id <" not in query.text


def test_sought_nodes_linked_differently_are_not_ordered():
    query, _ = compile_pattern(
        pattern(
            [{"key": "a", "label": "OSOBA"}, {"key": "b", "label": "OSOBA"}, {"key": "k"}],
            [
                {"source": "a", "target": "k", "type": "GRA_W", "direction": "out"},
                {"source": "b", "target": "k", "type": "GRA_W", "direction": "in"},
            ],
        )
    )
    assert ".id <" not in query.text


def test_known_nodes_are_never_ordered():
    query, _ = compile_pattern(TWO_PLAYERS_ONE_CLUB)
    assert ".id <" not in query.text


def test_a_link_that_must_not_exist_is_a_condition_not_a_match():
    query, params = compile_pattern(
        pattern(
            [{"key": "k", "ids": ["inter"]}, {"key": "j", "ids": ["jan"]}, {"key": "o"}],
            [
                {"source": "o", "target": "k", "type": "GRA_W"},
                {"source": "o", "target": "j", "type": "ZNA", "mode": "not"},
            ],
        )
    )
    # The excluded entity is never matched, only kept out of every match.
    assert "(j:Entity" not in query.text
    assert "NONE(_kid IN $j_ids WHERE EXISTS { MATCH (o)-[:`ZNA`]-" in query.text
    assert "NOT o.id IN $j_ids" in query.text
    assert params["j_ids"] == ["jan"]


def test_at_least_counts_the_known_entities_linked():
    query, params = compile_pattern(
        pattern(
            [{"key": "k", "ids": ["a", "b", "c"], "at_least": 2}, {"key": "o"}],
            [{"source": "o", "target": "k", "type": "GRA_W"}],
        )
    )
    assert "size([_kid IN $k_ids WHERE EXISTS" in query.text
    assert ">= $k_at_least" in query.text and params["k_at_least"] == 2


def test_an_optional_link_comes_last_and_may_be_empty():
    query, _ = compile_pattern(
        pattern(
            [{"key": "k", "ids": ["inter"]}, {"key": "o"}, {"key": "t", "label": "TRENER"}],
            [
                {"source": "o", "target": "k"},
                {"source": "t", "target": "o", "mode": "optional"},
            ],
        )
    )
    lines = query.text.splitlines()
    optional = next(i for i, line in enumerate(lines) if line.startswith("OPTIONAL MATCH"))
    assert all(not line.startswith("MATCH") for line in lines[optional:])
    assert "t <> o" in lines[optional + 1] and "t <> o" not in "\n".join(lines[:optional])
    assert "coalesce(relationships(o1), [])" in query.text


def test_mentioned_together_goes_through_an_article_of_the_space():
    query, _ = compile_pattern(
        pattern(
            [{"key": "k", "ids": ["inter"]}, {"key": "o"}],
            [{"source": "o", "target": "k", "via": "articles"}],
        )
    )
    assert "<-[:MENTIONS]-(:Article {space_id: $space_id})-[:MENTIONS]->" in query.text
    # Mentions are told as one link between the two, and articles never come back.
    assert "type(r) <> 'MENTIONS'" in query.text and "WHERE x:Entity" in query.text


def test_link_count_counts_different_entities_of_a_type():
    query, params = compile_pattern(
        pattern([{"key": "o", "link_count": {"min": 2, "type": "GRA_W", "label": "KLUB"}}])
    )
    assert (
        "size(COLLECT { MATCH (o)-[_r:`GRA_W`]-(_m:Entity {space_id: $space_id,"
        " label: $o_count_label}) RETURN DISTINCT _m.id }) >= $o_count_min"
    ) in query.text
    assert params["o_count_min"] == 2 and params["o_count_label"] == "KLUB"


@pytest.mark.parametrize(
    ("nodes", "edges", "message"),
    [
        ([{"key": "a", "ids": ["x"]}], [], "szukasz"),
        (
            [{"key": "a", "ids": ["x"]}, {"key": "b"}, {"key": "c"}],
            [{"source": "a", "target": "b"}],
            "połączone",
        ),
        ([{"key": "a"}, {"key": "a"}], [], "klucz"),
        ([{"key": "a"}, {"key": "b"}], [{"source": "a", "target": "z"}], "spoza"),
        (
            [{"key": "a"}, {"key": "b"}],
            [{"source": "a", "target": "b", "min_hops": 3, "max_hops": 2}],
            "długość",
        ),
        (
            [{"key": "a", "ids": ["x"]}, {"key": "b"}],
            [{"source": "a", "target": "b", "mode": "optional"}],
            "szukasz",
        ),
        (
            [{"key": "a", "ids": ["x"]}, {"key": "b"}, {"key": "c"}],
            [
                {"source": "a", "target": "b"},
                {"source": "b", "target": "c", "mode": "optional"},
                {"source": "a", "target": "c"},
            ],
            "Opcjonalne",
        ),
        (
            [{"key": "a", "ids": ["x"]}, {"key": "b", "ids": ["y"]}, {"key": "c"}],
            [{"source": "a", "target": "c"}, {"source": "a", "target": "b", "mode": "not"}],
            "Wykluczone",
        ),
        (
            [{"key": "a", "ids": ["x"]}, {"key": "b"}],
            [{"source": "a", "target": "b", "via": "articles", "type": "GRA_W"}],
            "Wspomniane",
        ),
        (
            [{"key": "a", "ids": ["x", "y"], "at_least": 3}, {"key": "b"}],
            [{"source": "a", "target": "b"}],
            "Co najmniej",
        ),
        (
            [{"key": "a", "ids": ["x"], "link_count": {"min": 2}}, {"key": "b"}],
            [{"source": "a", "target": "b"}],
            "szukanej",
        ),
        ([{"key": "A b"}], [], "pattern"),
        ([{"key": "a", "label": "KLUB`) DETACH DELETE (x"}], [], "pattern"),
    ],
)
def test_malformed_patterns_are_refused(nodes, edges, message):
    with pytest.raises(ValidationError, match=message):
        pattern(nodes, edges)
