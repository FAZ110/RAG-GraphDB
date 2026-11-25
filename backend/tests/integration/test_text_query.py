"""Questions in words on the graph from sample_graph.py, with a fixed answer in place of the
model: Jan ─GRA_W→ Inter ←GRA_W─ Anna,  Jan ─ZNA→ Anna,  Ewa ─GRA_W→ Milan ─RYWAL→ Inter
"""

import pytest

from tests.integration.conftest import cypher
from tests.integration.sample_graph import ARTICLE_A, ARTICLE_B


@pytest.fixture
def ids(space, extract) -> dict:
    extract(space, *ARTICLE_A, url="https://x.pl/a")
    extract(space, *ARTICLE_B, url="https://x.pl/b")
    rows = cypher("MATCH (n:Entity {space_id: $s}) RETURN n.name AS name, n.id AS id", s=space)
    return {r["name"]: r["id"] for r in rows}


@pytest.fixture
def model(monkeypatch):
    """The model's next answers, and the messages it was sent."""

    class Model:
        answers: list[dict] = []
        calls: list[list[dict]] = []
        formats: list[dict | None] = []

        def __init__(self, provider, scope):
            pass

        def chat_json(self, messages, response_format=None):
            Model.calls.append(messages)
            Model.formats.append(response_format)
            return Model.answers.pop(0)

    Model.answers, Model.calls, Model.formats = [], [], []
    monkeypatch.setattr("services.text_query.translate.LLMService", Model)
    return Model


@pytest.fixture
def ask(client, alice, space):
    def call(text: str, status: int = 200, provider: str = "local") -> dict:
        body = {"text": text, "provider": provider}
        r = client.post(f"/spaces/{space}/graph/query/from-text", json=body, headers=alice.headers)
        assert r.status_code == status, r.text
        return r.json()

    return call


def players_of(*names: str) -> dict:
    return {
        "nodes": [
            {"key": "k1", "names": list(names), "at_least": None},
            {"key": "x1", "label": "OSOBA", "name_contains": None, "link_count": None},
        ],
        "edges": [
            {"source": "x1", "target": "k1", "type": "GRA_W", "direction": "out", "max_hops": 1}
        ],
    }


def test_a_question_becomes_a_pattern_of_the_spaces_entities(ids, model, ask):
    model.answers = [players_of("inter")]
    result = ask("Kto gra w Interze?")
    assert result["pattern"]["nodes"][0] == {"key": "k1", "ids": [ids["Inter"]]}
    assert [e["name"] for e in result["entities"]] == ["Inter"]
    assert result["missing"] == []
    prompt = model.calls[0][1]["content"]
    assert "OSOBA -[GRA_W]-> KLUB" in prompt


def test_a_name_off_by_its_ending_finds_the_entity(ids, model, ask):
    model.answers = [players_of("Intera")]
    assert ask("Kto gra w Interze?")["pattern"]["nodes"][0]["ids"] == [ids["Inter"]]


def test_a_name_the_space_lacks_is_reported(ids, model, ask):
    model.answers = [players_of("Real Madryt")]
    result = ask("Kto gra w Realu?")
    assert result["missing"] == ["Real Madryt"]
    assert [n["key"] for n in result["pattern"]["nodes"]] == ["x1"]
    assert result["entities"] == []


def test_the_answer_runs_as_a_query(client, alice, space, ids, model, ask):
    model.answers = [players_of("Inter")]
    pattern = ask("Kto gra w Interze?")["pattern"]
    r = client.post(f"/spaces/{space}/graph/query", json=pattern, headers=alice.headers)
    names = {n["id"]: n["name"] for n in r.json()["nodes"]}
    assert sorted(names[m["x1"]] for m in r.json()["matches"]) == ["Anna", "Jan"]


def test_a_refusal_is_explained(ids, model, ask):
    model.answers = [{"error": "Graf nie zawiera dat."}]
    assert ask("Kiedy Jan przeszedł do Interu?", status=422)["detail"] == "Graf nie zawiera dat."


def test_an_empty_space_has_nothing_to_ask_about(model, ask):
    assert "nie ma jeszcze encji" in ask("Kto gra w Interze?", status=422)["detail"]
    assert model.calls == []


def test_server_models_need_the_admins_grant(client, alice, ids, model, ask):
    cypher("MATCH (u:User {id: $id}) SET u.server_models = false", id=alice.id)
    ask("Kto gra w Interze?", status=403)
    assert model.calls == []


def test_another_users_model_is_refused(ids, model, ask):
    ask("Kto gra w Interze?", status=422, provider="custom:not-mine")
    assert model.calls == []


def test_the_server_models_calls_count_in_the_shared_limit(ids, model, ask, monkeypatch):
    monkeypatch.setattr("services.text_query.translate.SERVER_LLM_PER_MINUTE", 1)
    model.answers = [players_of("Inter")]
    ask("Kto gra w Interze?")
    assert "spróbuj za" in ask("Kto gra w Interze?", status=429)["detail"]
    assert len(model.calls) == 1


def test_the_model_is_told_the_named_entities_and_their_links(ids, model, ask):
    model.answers = [players_of("Inter")]
    ask("Kto gra w Interze, a kto w Milanie?")
    prompt = model.calls[0][1]["content"]
    assert "- „Inter” (KLUB): <-[GRA_W]- OSOBA (2), <-[RYWAL]- KLUB (1)" in prompt
    assert "- „Milan” (KLUB):" in prompt
    assert "GRA_W" in model.formats[0]["json_schema"]["schema"]["$defs"]["type"]["enum"]


def test_a_question_naming_no_entity_has_no_such_list(ids, model, ask):
    model.answers = [players_of("Inter")]
    ask("Kto w ogóle tu gra?")
    assert "ENCJE Z PYTANIA" not in model.calls[0][1]["content"]
