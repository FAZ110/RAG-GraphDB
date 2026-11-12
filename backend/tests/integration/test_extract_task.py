import copy
from types import SimpleNamespace

import pytest
import redis

from core.config import REDIS_URL
from tasks.extract_task import _SLOT_KEY, _extract, _run_extraction
from tests.integration.conftest import FakeLLM, article_status, cypher, job_results

TEXT = "Jan Kowalski mieszka w Warszawie. Lubi spacery."
GRAPH = {
    "nodes": [
        {"id": "1", "label": "OSOBA", "type": "OSOBA",
         "properties": {"name": "Jan Kowalski"}, "evidence": ["S1"]},
        {"id": "2", "label": "MIEJSCE", "type": "MIEJSCE",
         "properties": {"name": "Warszawa"}, "evidence": ["S1"]},
    ],
    "edges": [{"source": "1", "target": "2", "type": "MIESZKA_W", "evidence": ["S1"]}],
}  # fmt: skip


@pytest.fixture
def llm(monkeypatch) -> FakeLLM:
    fake = FakeLLM(GRAPH)
    monkeypatch.setattr("tasks.extract_task.LLMService", lambda provider, owner_id: fake)
    return fake


@pytest.fixture
def uploaded(client, alice, space, queued):
    """Upload one article, return the task's arguments the broker would carry."""

    def make(text: str = TEXT, url: str = "") -> dict:
        body = {"articles": [{"title": "Artykuł", "url": url, "content": text}]}
        r = client.post(f"/spaces/{space}/articles", json=body, headers=alice.headers)
        assert r.status_code == 202, r.text
        return queued[-1]

    return make


def run(task: dict) -> dict | None:
    return _run_extraction(task["job_id"], task["article_id"], "local", task["token"])


def entities(space: str) -> list[str]:
    rows = cypher("MATCH (n:Entity {space_id: $s}) RETURN n.name AS name ORDER BY name", s=space)
    return [r["name"] for r in rows]


def test_extraction_writes_graph_and_marks_ok(client, alice, space, llm, uploaded):
    task = uploaded()
    result = run(task)

    assert result["status"] == "ok"
    assert (result["nodes_count"], result["edges_count"]) == (2, 1)
    assert article_status(task["article_id"]) == "ok"
    assert entities(space) == ["Jan Kowalski", "Warszawa"]
    assert "[S1] Jan Kowalski mieszka w Warszawie." in llm.calls[0]["content"]


def test_evidence_becomes_spans_of_the_cited_sentence(space, llm, uploaded):
    run(uploaded())
    spans = cypher(
        "MATCH (:Article)-[m:MENTIONS]->(n:Entity {name: 'Warszawa'}) RETURN m.spans AS s"
    )
    assert spans[0]["s"] == ["0:33"]


def test_second_article_merges_same_entity(space, llm, uploaded):
    run(uploaded(TEXT, "https://example.com/1"))
    run(uploaded("Jan Kowalski był w Warszawie wczoraj.", "https://example.com/2"))
    assert entities(space) == ["Jan Kowalski", "Warszawa"]
    mentions = cypher("MATCH (a:Article)-[:MENTIONS]->(:Entity {name: 'Jan Kowalski'}) RETURN a")
    assert len(mentions) == 2


def test_invalid_llm_json_gives_error_and_reports_it(space, llm, uploaded):
    llm.graph = {"nodes": [{"id": "1", "label": "zle", "properties": {"name": "x"}}], "edges": []}
    task = uploaded()

    _extract(None, task["job_id"], task["article_id"], "Artykuł", "local", task["token"])

    assert article_status(task["article_id"]) == "error"
    [result] = job_results(task["job_id"])
    assert result["status"] == "error" and result["error"]
    assert entities(space) == []


def test_cancelled_article_is_not_written(client, alice, space, llm, uploaded):
    task = uploaded()
    r = client.post(f"/spaces/{space}/batches/{task['job_id']}/cancel", headers=alice.headers)
    assert r.status_code == 204

    assert run(task) is None
    assert entities(space) == []
    assert article_status(task["article_id"]) == "cancelled"


@pytest.mark.parametrize(("action", "status"), [("cancel", "cancelled"), ("pause", "paused")])
def test_cancel_or_pause_during_llm_call_drops_result(
    client, alice, space, llm, uploaded, action, status
):
    task = uploaded()
    path = f"/spaces/{space}/batches/{task['job_id']}/{action}"
    llm.during = lambda: client.post(path, headers=alice.headers)

    assert run(task) is None
    assert llm.calls  # the extraction did start before it was stopped
    assert entities(space) == []
    assert article_status(task["article_id"]) == status


def test_newer_upload_during_llm_call_keeps_article_pending(client, alice, space, llm, uploaded):
    task = uploaded(TEXT, "https://example.com/1")
    llm.during = lambda: uploaded(TEXT + " Poprawka.", "https://example.com/1")

    assert run(task) is None
    assert entities(space) == []
    assert article_status(task["article_id"]) == "pending"


def test_stale_token_is_not_written(space, llm, uploaded):
    task = uploaded()
    assert run({**task, "token": "token-z-poprzedniego-uploadu"}) is None
    assert entities(space) == []


def test_server_models_revoked_gives_error(alice, space, llm, uploaded):
    task = uploaded()
    cypher("MATCH (u:User {id: $id}) SET u.server_models = false", id=alice.id)
    result = run(task)
    assert result["status"] == "error"
    assert "Model serwera" in result["error"]
    assert llm.calls == []


def test_reextraction_replaces_article_share_of_graph(space, llm, uploaded):
    run(uploaded(TEXT, "https://example.com/1"))
    llm.graph = {
        "nodes": [{"id": "1", "label": "OSOBA", "properties": {"name": "Anna Nowak"}}],
        "edges": [],
    }
    run(uploaded(TEXT + " Zmiana.", "https://example.com/1"))
    mentioned = cypher("MATCH (:Article)-[:MENTIONS]->(n:Entity) RETURN n.name AS name")
    assert [m["name"] for m in mentioned] == ["Anna Nowak"]


INJECTION = "A`]->(X) DETACH DELETE X//"


@pytest.mark.parametrize("where", ["label", "edge type"])
def test_injected_identifier_fails_the_article_and_leaves_the_graph(space, llm, uploaded, where):
    run(uploaded(TEXT, "https://example.com/1"))
    bad = copy.deepcopy(GRAPH)
    if where == "label":
        # A new name: one matching an existing entity is merged into it and takes its label.
        bad["nodes"][0] |= {"label": INJECTION, "properties": {"name": "Zbigniew Nowy"}}
    else:
        bad["edges"][0]["type"] = INJECTION
    llm.graph = bad
    task = uploaded("Inny tekst o Janie.", "https://example.com/2")

    result = run(task)

    assert result["status"] == "error"
    assert "Unsafe" in result["error"]
    assert entities(space) == ["Jan Kowalski", "Warszawa"]
    assert cypher("MATCH (n) WHERE n.name IS NOT NULL AND NOT n:Entity AND NOT n:Space"
                  " AND NOT n:Analysis RETURN n") == []  # fmt: skip


def test_llm_cannot_move_an_entity_to_another_space(space, llm, uploaded):
    hijack = copy.deepcopy(GRAPH)
    hijack["nodes"][0]["properties"] |= {"space_id": "cudza-przestrzen", "id": "przejete"}
    llm.graph = hijack

    assert run(uploaded())["status"] == "ok"

    rows = cypher("MATCH (n:Entity {name: 'Jan Kowalski'}) RETURN n.space_id AS s, n.id AS id")
    assert rows[0]["s"] == space
    assert rows[0]["id"] != "przejete"


def test_empty_graph_from_llm_finishes_the_article_with_nothing(space, llm, uploaded):
    llm.graph = {"nodes": [], "edges": []}
    task = uploaded()
    result = run(task)
    assert (result["status"], result["nodes_count"], result["edges_count"]) == ("ok", 0, 0)
    assert article_status(task["article_id"]) == "ok"
    assert entities(space) == []


class Retried(Exception):
    pass


class FakeTask:
    soft_time_limit = 600

    def __init__(self, retries: int = 0) -> None:
        self.request = SimpleNamespace(retries=retries)

    def retry(self, **kwargs):
        self.retry_kwargs = kwargs
        return Retried()


@pytest.fixture
def limit(monkeypatch):
    """Whether the custom model is local, in place of the saved provider's switch."""
    value = {"local": True}
    monkeypatch.setattr("tasks.extract_task.custom_provider_is_local", lambda pid: value["local"])
    return value


def slot():
    return redis.from_url(REDIS_URL).lock(_SLOT_KEY.format(provider_id="p1"), timeout=60)


def run_custom(task: dict, fake_task=None):
    _extract(fake_task, task["job_id"], task["article_id"], "Artykuł", "custom:p1", task["token"])


def queued_at(article_id: str):
    return cypher("MATCH (a:Article {id: $id}) RETURN a.queued_at AS t", id=article_id)[0]["t"]


def test_busy_model_sends_the_article_back_untouched(space, llm, uploaded, limit):
    task, taken, fake_task = uploaded(), slot(), FakeTask(retries=1)
    assert taken.acquire(blocking=False)
    before = queued_at(task["article_id"])
    with pytest.raises(Retried):
        run_custom(task, fake_task)
    assert llm.calls == [] and fake_task.retry_kwargs["countdown"] > 0
    # Not started and not written to: waiting costs only a read and a Redis call.
    assert article_status(task["article_id"]) == "pending"
    assert queued_at(task["article_id"]) == before

    taken.release()
    run_custom(task)
    assert article_status(task["article_id"]) == "ok"


def test_long_wait_keeps_the_article_from_counting_as_stalled(space, llm, uploaded, limit):
    task, taken = uploaded(), slot()
    assert taken.acquire(blocking=False)
    cypher(
        "MATCH (a:Article {id: $id}) SET a.queued_at = datetime() - duration({minutes: 14})",
        id=task["article_id"],
    )
    before = queued_at(task["article_id"])
    with pytest.raises(Retried):
        run_custom(task, FakeTask(retries=30))
    assert queued_at(task["article_id"]) > before
    taken.release()


def test_cloud_model_is_not_limited_to_one_article(space, llm, uploaded, limit):
    limit["local"] = False
    taken = slot()
    assert taken.acquire(blocking=False)
    task = uploaded()
    run_custom(task)
    assert article_status(task["article_id"]) == "ok"
    taken.release()


def test_slot_is_free_again_while_the_graph_is_written(space, llm, uploaded, limit, monkeypatch):
    from db.json_validator import validate_graph_json

    free = []

    def validate_after_model(raw):
        free.append(slot().acquire(blocking=False))
        return validate_graph_json(raw)

    monkeypatch.setattr("tasks.extract_task.validate_graph_json", validate_after_model)
    task = uploaded()
    run_custom(task)
    assert free == [True] and article_status(task["article_id"]) == "ok"


def test_slot_is_freed_when_the_model_fails(space, llm, uploaded, limit):
    llm.graph = {"nodes": "zepsute"}
    task = uploaded()
    run_custom(task)
    assert article_status(task["article_id"]) == "error"
    assert slot().acquire(blocking=False)
