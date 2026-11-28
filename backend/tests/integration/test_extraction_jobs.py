import pytest
import redis

from core.config import REDIS_URL
from services.articles.identity import content_hash
from tests.integration.conftest import article_status, cypher, job_results

TEXT = "Jan Kowalski mieszka w Warszawie."


def upload(client, user, space, articles, **extra):
    r = client.post(
        f"/spaces/{space}/articles", json={"articles": articles, **extra}, headers=user.headers
    )
    assert r.status_code == 202, r.text
    return r.json()["job_id"]


def mark_processed(article_id: str, text: str) -> None:
    """The state a successful extraction leaves behind."""
    cypher(
        "MATCH (a:Article {id: $id}) SET a.status = 'ok', a.processed_hash = $hash,"
        " a.nodes_count = 2, a.edges_count = 1",
        id=article_id,
        hash=content_hash(text),
    )


def batch(client, user, space, job, action):
    return client.post(f"/spaces/{space}/batches/{job}/{action}", headers=user.headers)


def test_upload_queues_new_articles(client, alice, space, queued):
    articles = [{"title": "A", "content": "Tekst A."}, {"title": "B", "content": "Tekst B."}]
    job = upload(client, alice, space, articles)
    assert {q["title"] for q in queued} == {"A", "B"}
    assert all(q["job_id"] == job and q["provider"] == "local" for q in queued)
    assert all(article_status(q["article_id"]) == "pending" for q in queued)


def test_reupload_unchanged_reports_unchanged_without_queueing(client, alice, space, queued):
    article = {"url": "https://example.com/a", "title": "A", "content": TEXT}
    upload(client, alice, space, [article])
    mark_processed(queued[0]["article_id"], TEXT)

    job = upload(client, alice, space, [article])
    assert len(queued) == 1
    [result] = job_results(job)
    assert result["unchanged"] is True
    assert (result["nodes_count"], result["edges_count"]) == (2, 1)


def test_reupload_with_reflowed_whitespace_is_unchanged(client, alice, space, queued):
    upload(client, alice, space, [{"url": "https://example.com/a", "content": TEXT}])
    mark_processed(queued[0]["article_id"], TEXT)
    reflowed = TEXT.replace(" ", "\n  ")
    upload(client, alice, space, [{"url": "https://example.com/a", "content": reflowed}])
    assert len(queued) == 1


def test_reupload_changed_text_requeues(client, alice, space, queued):
    upload(client, alice, space, [{"url": "https://example.com/a", "content": TEXT}])
    mark_processed(queued[0]["article_id"], TEXT)
    upload(client, alice, space, [{"url": "https://example.com/a", "content": TEXT + " Nowe."}])
    assert len(queued) == 2
    assert queued[0]["article_id"] == queued[1]["article_id"]
    assert queued[0]["token"] != queued[1]["token"]


def test_force_requeues_unchanged(client, alice, space, queued):
    article = {"url": "https://example.com/a", "content": TEXT}
    upload(client, alice, space, [article])
    mark_processed(queued[0]["article_id"], TEXT)
    upload(client, alice, space, [article], force=True)
    assert len(queued) == 2


def test_same_url_with_tracking_params_is_one_article(client, alice, space, queued):
    upload(client, alice, space, [{"url": "https://example.com/a?utm_source=x", "content": TEXT}])
    upload(client, alice, space, [{"url": "https://example.com/a/", "content": TEXT}])
    assert len(client.get(f"/spaces/{space}/articles", headers=alice.headers).json()) == 1


def test_blank_content_rejected(client, alice, space, queued):
    r = client.post(
        f"/spaces/{space}/articles",
        json={"articles": [{"content": "   "}]},
        headers=alice.headers,
    )
    assert r.status_code == 422
    assert queued == []


def test_retry_with_nothing_failed_409(client, alice, space, queued):
    upload(client, alice, space, [{"content": TEXT}])
    r = client.post(f"/spaces/{space}/articles/retry", json={}, headers=alice.headers)
    assert r.status_code == 409


def test_retry_requeues_errored(client, alice, space, queued):
    upload(client, alice, space, [{"title": "A", "content": TEXT}])
    article_id = queued[0]["article_id"]
    cypher("MATCH (a:Article {id: $id}) SET a.status = 'error', a.error = 'x'", id=article_id)

    r = client.post(f"/spaces/{space}/articles/retry", json={}, headers=alice.headers)
    assert r.status_code == 202
    assert queued[-1]["article_id"] == article_id
    assert queued[-1]["job_id"] == r.json()["job_id"]
    assert article_status(article_id) == "pending"


def test_pause_drops_tokens_and_resume_requeues(client, alice, space, queued):
    job = upload(client, alice, space, [{"title": "A", "content": TEXT}])
    first = queued[0]

    assert batch(client, alice, space, job, "pause").status_code == 204
    assert queued[-1] == {"dropped": [first["token"]]}
    assert article_status(first["article_id"]) == "paused"

    assert batch(client, alice, space, job, "resume").status_code == 204
    resumed = queued[-1]
    assert resumed["article_id"] == first["article_id"]
    assert resumed["token"] != first["token"]
    assert article_status(first["article_id"]) == "pending"


def test_cancel_reports_cancelled_results(client, alice, space, queued):
    job = upload(client, alice, space, [{"content": "Tekst A."}, {"content": "Tekst B."}])
    assert batch(client, alice, space, job, "cancel").status_code == 204
    results = job_results(job)
    assert sorted(r["status"] for r in results) == ["cancelled", "cancelled"]
    assert {r["article_id"] for r in results} == {q["article_id"] for q in queued[:2]}


def test_unknown_batch_action_422(client, alice, space, queued):
    job = upload(client, alice, space, [{"content": TEXT}])
    assert batch(client, alice, space, job, "explode").status_code == 422


def test_latest_batch_counts(client, alice, space, queued):
    upload(client, alice, space, [{"content": "Tekst A."}, {"content": "Tekst B."}])
    mark_processed(queued[0]["article_id"], "Tekst A.")
    r = client.get(f"/spaces/{space}/batches/latest", headers=alice.headers)
    assert r.status_code == 200
    assert (r.json()["total"], r.json()["ok"], r.json()["pending"]) == (2, 1, 1)


def test_waiting_article_is_stalled_only_when_its_queue_runs_nothing(client, alice, space, queued):
    from db.spaces.articles import mark_queue_alive

    upload(client, alice, space, [{"content": "Tekst A."}])
    article_id = queued[0]["article_id"]
    cypher(
        "MATCH (a:Article {id: $id}) SET a.queued_at = datetime() - duration({minutes: 20})",
        id=article_id,
    )
    mark_queue_alive("shared")
    client.get(f"/spaces/{space}/articles", headers=alice.headers)
    assert article_status(article_id) == "pending"
    redis.from_url(REDIS_URL).delete("queue-alive:shared")
    mark_queue_alive("custom")
    client.get(f"/spaces/{space}/articles", headers=alice.headers)
    assert article_status(article_id) == "error"


def test_article_waiting_a_day_is_stalled_even_in_a_busy_queue(client, alice, space, queued):
    from db.spaces.articles import mark_queue_alive

    upload(client, alice, space, [{"content": "Tekst A."}])
    article_id = queued[0]["article_id"]
    cypher(
        "MATCH (a:Article {id: $id}) SET a.queued_at = datetime() - duration({hours: 25})",
        id=article_id,
    )
    mark_queue_alive("shared")
    client.get(f"/spaces/{space}/articles", headers=alice.headers)
    assert article_status(article_id) == "error"


def test_upload_queues_articles_in_their_order(client, alice, space, queued):
    articles = [{"title": f"A{i}", "content": f"Tekst {i}."} for i in range(30)]
    upload(client, alice, space, articles)
    assert [q["title"] for q in queued] == [a["title"] for a in articles]
    assert len({q["article_id"] for q in queued}) == 30


def test_same_article_twice_in_one_upload_keeps_the_later_text(client, alice, space, queued):
    url = "https://example.com/a"
    job = upload(
        client, alice, space, [{"url": url, "content": TEXT}, {"url": url, "content": "Inny."}]
    )
    [task] = queued
    [row] = cypher(
        "MATCH (a:Article {id: $id}) RETURN a.content AS content, a.queue_token AS token",
        id=task["article_id"],
    )
    assert row == {"content": "Inny.", "token": task["token"]}
    assert redis.from_url(REDIS_URL).get(f"job:{job}:total") == b"1"


def test_articles_left_unqueued_by_a_broker_failure_are_failed(client, alice, space, monkeypatch):
    sent = []

    def flaky(job_id, article_id, title, provider, token):
        if sent:
            raise ConnectionError("broker down")
        sent.append(article_id)

    monkeypatch.setattr("services.jobs.extraction.queue_extraction", flaky)
    with pytest.raises(ConnectionError):
        client.post(
            f"/spaces/{space}/articles",
            json={
                "articles": [
                    {"title": "A", "content": "Tekst A."},
                    {"title": "B", "content": "Tekst B."},
                ]
            },
            headers=alice.headers,
        )
    rows = cypher("MATCH (a:Article {space_id: $s}) RETURN a.title AS t, a.status AS s", s=space)
    assert sorted((r["t"], r["s"]) for r in rows) == [("A", "pending"), ("B", "error")]


def test_delete_succeeds_when_tasks_cannot_be_dropped(client, alice, space, queued, monkeypatch):
    upload(client, alice, space, [{"content": "Tekst A."}])

    def broken(tokens):
        raise ConnectionError("broker down")

    monkeypatch.setattr("services.jobs.extraction.drop_queued", broken)
    r = client.post(
        f"/spaces/{space}/articles/delete",
        json={"article_ids": [queued[0]["article_id"]]},
        headers=alice.headers,
    )
    assert r.status_code == 200
    assert r.json()["deleted"] == [queued[0]["article_id"]]


def dropped(queued) -> list[str]:
    return [t for call in queued if "dropped" in call for t in call["dropped"]]


def test_deleting_articles_drops_their_queued_tasks(client, alice, space, queued):
    upload(client, alice, space, [{"content": "Tekst A."}, {"content": "Tekst B."}])
    waiting, done = queued[0], queued[1]
    mark_processed(done["article_id"], "Tekst B.")

    r = client.post(
        f"/spaces/{space}/articles/delete",
        json={"article_ids": [waiting["article_id"], done["article_id"]]},
        headers=alice.headers,
    )
    assert r.json() == {"deleted": [waiting["article_id"], done["article_id"]], "processing": []}
    assert dropped(queued) == [waiting["token"]]


def test_clearing_a_space_drops_its_queued_tasks(client, alice, space, queued):
    upload(client, alice, space, [{"content": "Tekst A."}, {"content": "Tekst B."}])
    assert client.delete(f"/spaces/{space}/articles", headers=alice.headers).status_code == 204
    assert sorted(dropped(queued)) == sorted(q["token"] for q in queued if "token" in q)


def test_deleting_a_space_drops_its_queued_tasks(client, alice, space, queued):
    upload(client, alice, space, [{"content": "Tekst A."}])
    assert client.delete(f"/spaces/{space}", headers=alice.headers).status_code == 204
    assert dropped(queued) == [queued[0]["token"]]
