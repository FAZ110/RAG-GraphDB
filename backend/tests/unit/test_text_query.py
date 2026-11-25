import json

import httpx
import pytest
from openai import RateLimitError

from services.text_query import draft, prompt
from services.text_query.anchors import find_in_question, section
from services.text_query.examples import EXAMPLES, known, link, sought, together
from services.text_query.output_schema import response_format
from services.text_query.resolve import looks_alike
from services.text_query.translate import QuestionNotAnswerable, _draft, _request

SCHEMA = {
    "labels": [{"label": "OSOBA", "count": 3}, {"label": "KLUB", "count": 2}],
    "relations": [
        {"source": "OSOBA", "type": "GRA_W", "target": "KLUB", "count": 3},
        {"source": "OSOBA", "type": "ZNA", "target": "OSOBA", "count": 1},
    ],
}

PLAYERS_OF_INTER = {
    "nodes": [known("k1", "Inter"), sought("x1", "OSOBA")],
    "edges": [link("x1", "k1", "GRA_W")],
}


def as_schema(example: dict) -> dict:
    return {
        "labels": [{"label": label, "count": 1} for label in example["labels"]],
        "relations": [
            {"source": s, "type": t, "target": e, "count": 1} for s, t, e in example["relations"]
        ],
    }


@pytest.mark.parametrize(("schema", "question", "answer"), EXAMPLES, ids=[e[1] for e in EXAMPLES])
def test_every_example_in_the_prompt_is_a_valid_answer(schema, question, answer):
    assert question in prompt.SYSTEM_PROMPT
    if "error" not in answer:
        assert draft.problems(answer, as_schema(schema)) == []


def test_the_prompt_lists_the_space_schema_and_the_question():
    [system, user] = prompt.messages(SCHEMA, "Kto gra w Interze?")
    assert system["role"] == "system"
    assert "- OSOBA (3)" in user["content"]
    assert "- OSOBA -[GRA_W]-> KLUB (3)" in user["content"]
    assert user["content"].endswith("Pytanie: Kto gra w Interze?")


def test_the_schema_is_cut_to_the_most_common_types():
    labels = [{"label": f"T{i}", "count": 100 - i} for i in range(prompt.MAX_LABELS + 5)]
    section = prompt.schema_section({"labels": labels, "relations": []})
    assert f"- T{prompt.MAX_LABELS - 1} " in section
    assert f"- T{prompt.MAX_LABELS} " not in section
    assert "… i 5 rzadszych typów" in section
    assert "brak relacji" in section


def test_a_valid_answer_has_no_problems():
    assert draft.problems(PLAYERS_OF_INTER, SCHEMA) == []


def test_types_the_space_lacks_are_problems():
    answer = {
        "nodes": [known("k1", "Inter"), sought("x1", "PIŁKARZ")],
        "edges": [link("x1", "k1", "WYSTĘPUJE_W")],
    }
    problems = draft.problems(answer, SCHEMA)
    assert any("„PIŁKARZ”" in p for p in problems)
    assert any("„WYSTĘPUJE_W”" in p for p in problems)


def test_the_patterns_own_rules_apply():
    no_sought = {"nodes": [known("k1", "Inter"), known("k2", "Milan")], "edges": []}
    assert any("szukasz" in p for p in draft.problems(no_sought, SCHEMA))
    loose = {"nodes": [known("k1", "Inter"), sought("x1"), sought("x2")], "edges": []}
    assert any("połączone" in p for p in draft.problems(loose, SCHEMA))
    bad_way = {**PLAYERS_OF_INTER, "edges": [link("x1", "k1", "GRA_W", direction="up")]}
    assert any("direction" in p for p in draft.problems(bad_way, SCHEMA))


def test_an_answer_of_the_wrong_shape_is_a_problem():
    assert draft.problems({"nodes": "Inter"}, SCHEMA)


def test_unknown_types_are_left_open():
    answer = {
        "nodes": [
            sought("x1", "PIŁKARZ", link_count={"min": 2, "type": "GRA", "label": "KLUB"}),
            known("k1", "Inter"),
        ],
        "edges": [link("x1", "k1", "WYSTĘPUJE_W")],
    }
    fixed = draft.without_unknown_types(answer, SCHEMA)
    assert fixed["nodes"][0]["label"] is None
    assert fixed["nodes"][0]["link_count"] == {"min": 2, "type": None, "label": "KLUB"}
    assert fixed["edges"][0]["type"] is None
    assert draft.problems(fixed, SCHEMA) == []


def test_names_become_ids():
    pattern, missing = draft.to_pattern(PLAYERS_OF_INTER, {"Inter": "id-inter"})
    assert missing == []
    assert pattern["nodes"] == [{"key": "k1", "ids": ["id-inter"]}, {"key": "x1", "label": "OSOBA"}]
    assert pattern["edges"] == [
        {
            "source": "x1",
            "target": "k1",
            "type": "GRA_W",
            "direction": "out",
            "min_hops": 1,
            "max_hops": 1,
            "mode": "required",
            "via": "relation",
        }
    ]


def test_a_known_node_with_no_entity_goes_with_its_links():
    answer = {
        "nodes": [known("k1", "Inter"), known("k2", "Realu"), sought("x1")],
        "edges": [link("x1", "k1"), together("x1", "k2")],
    }
    pattern, missing = draft.to_pattern(answer, {"Inter": "i"})
    assert missing == ["Realu"]
    assert [n["key"] for n in pattern["nodes"]] == ["k1", "x1"]
    assert len(pattern["edges"]) == 1


def test_at_least_shrinks_to_the_entities_found():
    answer = {
        "nodes": [known("k1", "Inter", "Milan", "Juventus", at_least=3), sought("x1")],
        "edges": [link("x1", "k1")],
    }
    pattern, _ = draft.to_pattern(answer, {"Inter": "i", "Milan": "m"})
    assert pattern["nodes"][0] == {"key": "k1", "ids": ["i", "m"], "at_least": 2}
    pattern, _ = draft.to_pattern(answer, {"Inter": "i"})
    assert pattern["nodes"][0] == {"key": "k1", "ids": ["i"]}


@pytest.mark.parametrize(
    ("wanted", "name", "alike"),
    [
        ("Lech Poznań", "Lech Poznań", True),
        ("Lecha", "Lech Poznań", True),
        ("lech poznan", "Lech Poznań", True),
        ("Lewandowski", "Robert Lewandowski", True),
        ("Lech", "Legia Warszawa", False),
        ("Inter", "Milan", False),
    ],
)
def test_names_look_alike(wanted, name, alike):
    assert looks_alike(wanted, name) is alike


class FakeLLM:
    def __init__(self, *answers: dict) -> None:
        self.answers, self.calls, self.formats = list(answers), [], []

    def chat_json(self, messages: list[dict], response_format: dict | None = None) -> dict:
        self.calls.append(list(messages))
        self.formats.append(response_format)
        return self.answers.pop(0)


def test_a_wrong_answer_is_sent_back_with_its_problems():
    wrong = {**PLAYERS_OF_INTER, "nodes": [known("k1", "Inter"), sought("x1", "PIŁKARZ")]}
    llm = FakeLLM(wrong, PLAYERS_OF_INTER)
    assert _draft(llm, SCHEMA, "Kto gra w Interze?") == PLAYERS_OF_INTER
    retry = llm.calls[1]
    assert retry[-2]["role"] == "assistant"
    assert "„PIŁKARZ”" in retry[-1]["content"]


def test_types_still_unknown_after_the_retries_are_left_open():
    wrong = {**PLAYERS_OF_INTER, "nodes": [known("k1", "Inter"), sought("x1", "PIŁKARZ")]}
    llm = FakeLLM(wrong, wrong, wrong)
    assert _draft(llm, SCHEMA, "Kto gra w Interze?")["nodes"][1]["label"] is None
    assert len(llm.calls) == 3


def test_a_pattern_still_broken_after_the_retries_is_refused():
    loose = {"nodes": [known("k1", "Inter"), sought("x1"), sought("x2")], "edges": []}
    with pytest.raises(QuestionNotAnswerable, match="połączone"):
        _draft(FakeLLM(loose, loose, loose), SCHEMA, "?")


def test_the_models_refusal_reaches_the_user():
    refusal = {"error": "Graf nie zawiera dat."}
    with pytest.raises(QuestionNotAnswerable, match="Graf nie zawiera dat."):
        _draft(FakeLLM(refusal), SCHEMA, "Kiedy?")


class LimitedLLM(FakeLLM):
    """Answers once, then hits the provider's limit."""

    def chat_json(self, messages: list[dict], response_format: dict | None = None) -> dict:
        if self.calls:
            request = httpx.Request("POST", "https://llm.example/v1")
            raise RateLimitError("slow", response=httpx.Response(429, request=request), body=None)
        return super().chat_json(messages, response_format)


def test_a_retry_cut_by_the_rate_limit_keeps_a_fixable_answer():
    wrong = {**PLAYERS_OF_INTER, "nodes": [known("k1", "Inter"), sought("x1", "PIŁKARZ")]}
    answer = _draft(LimitedLLM(wrong), SCHEMA, "Kto gra w Interze?")
    assert answer["nodes"][1]["label"] is None


def test_a_retry_cut_by_the_rate_limit_reports_the_limit_when_nothing_is_usable():
    loose = {"nodes": [known("k1", "Inter"), sought("x1"), sought("x2")], "edges": []}
    with pytest.raises(RateLimitError):
        _draft(LimitedLLM(loose), SCHEMA, "?")


def candidate(name: str, label: str = "KLUB", degree: int = 1, aliases=()) -> dict:
    return {"id": name, "name": name, "label": label, "degree": degree, "aliases": list(aliases)}


@pytest.mark.parametrize(
    ("question", "names"),
    [
        ("Kto gra w Lechu Poznań?", ["Lech Poznań"]),
        ("Kto gra w lechu poznan?", ["Lech Poznań"]),
        ("Kto gra w Legii?", ["Legia"]),
        ("Kto gra w Interze?", ["Inter"]),
        ("kto gra w interze?", []),
        ("Firmy, w które inwestował fundusz Odra Capital", ["Odra Capital"]),
        ("Co łączy Kolejorza z Legią?", ["Lech Poznań", "Legia"]),
    ],
)
def test_entities_are_found_in_the_question_as_it_inflects_them(question, names):
    candidates = [
        candidate("Lech", degree=9),
        candidate("Lech Poznań", aliases=["Kolejorz"]),
        candidate("Legia"),
        candidate("Inter"),
        candidate("Odra Capital", "FUNDUSZ"),
    ]
    assert [e["name"] for e in find_in_question(question, candidates)] == names


def test_found_entities_are_listed_with_their_links_both_ways():
    found = [
        {
            "name": "Inter",
            "label": "KLUB",
            "links": [
                {"type": "GRA_W", "out": False, "label": "OSOBA", "count": 2},
                {"type": "RYWAL", "out": True, "label": "KLUB", "count": 1},
            ],
        }
    ]
    text = section(found)
    assert "- „Inter” (KLUB): <-[GRA_W]- OSOBA (2), -[RYWAL]-> KLUB (1)" in text
    [_, user] = prompt.messages(SCHEMA, "Kto gra w Interze?", found)
    assert text in user["content"]
    assert "ENCJE Z PYTANIA" not in prompt.messages(SCHEMA, "?")[1]["content"]


def strict_problems(schema: dict, where: str = "") -> list[str]:
    """What breaks the rules of strict structured outputs: every object closed, all required."""
    problems = []
    if "properties" in schema:
        if schema.get("additionalProperties") is not False:
            problems.append(f"{where}: open object")
        if set(schema.get("required", [])) != set(schema["properties"]):
            problems.append(f"{where}: optional fields")
        for name, child in schema["properties"].items():
            problems += strict_problems(child, f"{where}.{name}")
    if "items" in schema:
        problems += strict_problems(schema["items"], f"{where}[]")
    return problems


def allowed(value, schema: dict, defs: dict) -> bool:
    if "$ref" in schema:
        schema = defs[schema["$ref"].removeprefix("#/$defs/")]
    return "enum" not in schema or value in schema["enum"]


@pytest.mark.parametrize(("schema", "question", "answer"), EXAMPLES, ids=[e[1] for e in EXAMPLES])
def test_the_answer_schema_is_strict_and_allows_every_example(schema, question, answer):
    fmt = response_format(schema["labels"], [t for _, t, _ in schema["relations"]])
    root = fmt["json_schema"]["schema"]
    assert strict_problems(root) == []
    node, edge = root["properties"]["nodes"]["items"], root["properties"]["edges"]["items"]
    for n in answer.get("nodes", []):
        assert set(n) <= set(node["properties"])
        assert all(allowed(v, node["properties"][k], root["$defs"]) for k, v in n.items())
    for e in answer.get("edges", []):
        assert set(e) == set(edge["properties"])
        assert all(allowed(v, edge["properties"][k], root["$defs"]) for k, v in e.items())


def test_the_model_is_given_the_types_of_the_found_links_too():
    found = [
        {
            "name": "Inter",
            "label": "KLUB",
            "links": [{"type": "RZADKA", "out": False, "label": "TRENER", "count": 1}],
        }
    ]
    llm = FakeLLM(PLAYERS_OF_INTER)
    _draft(llm, SCHEMA, "Kto gra w Interze?", found)
    defs = llm.formats[0]["json_schema"]["schema"]["$defs"]
    edge_type, label = defs["type"]["enum"], defs["label"]["enum"]
    assert {"GRA_W", "ZNA", "RZADKA"} <= set(edge_type)
    assert {"OSOBA", "KLUB", "TRENER"} <= set(label)


def request_size(messages: list[dict], shape: dict) -> int:
    return sum(len(m["content"]) for m in messages) + len(json.dumps(shape))


def test_a_large_schema_is_narrowed_to_fit_the_request_budget():
    big = {
        "labels": [{"label": f"BARDZO_DŁUGI_TYP_ENCJI_{i}", "count": 500 - i} for i in range(80)],
        "relations": [
            {"source": "OSOBA", "type": f"BARDZO_DŁUGA_RELACJA_{i}", "target": "KLUB", "count": 1}
            for i in range(200)
        ],
    }
    messages, shape = _request(big, "Kto gra w Interze?", [])
    assert request_size(messages, shape) <= prompt.MAX_REQUEST_CHARS
    assert "BARDZO_DŁUGA_RELACJA_0 " in messages[1]["content"].replace("]", " ")
    assert f"BARDZO_DŁUGA_RELACJA_{prompt.MAX_RELATIONS - 1}]" not in messages[1]["content"]


def test_a_small_schema_is_shown_whole():
    messages, shape = _request(SCHEMA, "Kto gra w Interze?", [])
    assert "- OSOBA -[ZNA]-> OSOBA (1)" in messages[1]["content"]
    assert set(shape["json_schema"]["schema"]["$defs"]["type"]["enum"]) == {"GRA_W", "ZNA", None}


def test_a_relation_spelt_two_ways_is_left_open():
    schema = {
        **SCHEMA,
        "relations": [
            {"source": "OSOBA", "type": t, "target": "FIRMA", "count": 1}
            for t in ["JEST_CZŁONKIEM_ZARZĄDU", "JEST_CZŁONEM_ZARZĄDU", "PRACUJE_W"]
        ],
    }
    answer = {
        "nodes": [
            known("k1", "Altis"),
            sought("x1", link_count={"min": 2, "type": "JEST_CZŁONEM_ZARZĄDU", "label": None}),
        ],
        "edges": [link("x1", "k1", "JEST_CZŁONEM_ZARZĄDU"), link("x1", "k1", "PRACUJE_W")],
    }
    opened = draft.without_spelling_twins(answer, schema)
    assert [e["type"] for e in opened["edges"]] == [None, "PRACUJE_W"]
    assert opened["nodes"][1]["link_count"]["type"] is None


def test_relations_of_different_meaning_are_kept():
    schema = {
        **SCHEMA,
        "relations": [
            {"source": "KLUB", "type": t, "target": "KLUB", "count": 1}
            for t in ["WYGRAŁA_Z", "PRZEGRAŁA_Z", "STRZELIŁ_GOLA_W", "STRZELIŁ_GOLA_DLA"]
        ],
    }
    answer = {
        "nodes": [known("k1", "Lech"), sought("x1")],
        "edges": [link("x1", "k1", "PRZEGRAŁA_Z"), link("x1", "k1", "STRZELIŁ_GOLA_W")],
    }
    kept = draft.without_spelling_twins(answer, schema)
    assert [e["type"] for e in kept["edges"]] == ["PRZEGRAŁA_Z", "STRZELIŁ_GOLA_W"]


@pytest.mark.parametrize(
    ("a", "b", "twins"),
    [
        ("PRZEWODNICZYŁ", "PRZEWODNICZY_W", True),
        ("JEST_CZŁONKIEM_ZARZĄDU", "JEST_CZŁONEM_ZARZĄDU", True),
        ("MA_SIEDZIBĘ_W", "MA_SIEDZIE_W", True),
        ("JEST_PREZESEM", "PREZES", True),
        ("PRACUJE_W", "PRACUJE_DLA", False),
        ("STRZELIŁ_GOLA_W", "STRZELIŁ_GOL_W", True),
        ("STRZELIŁ_GOLA_W", "STRZELIŁ_GOLA_DLA", False),
        ("WYGRAŁA_Z", "PRZEGRAŁA_Z", False),
        ("GRA_W", "GRA_W_MECZU_Z", False),
        ("GRA_W", "GRAŁ_DLA", False),
        ("WYGRAŁ_W", "WYGRAŁA_PRZETARG_DLA", False),
    ],
)
def test_relation_twins_differ_only_in_spelling(a, b, twins):
    assert draft._twins(a, b) is twins
