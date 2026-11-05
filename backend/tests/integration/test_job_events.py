import asyncio
import json

from services.jobs.events import job_events
from services.jobs.results import push_result, unchanged_result


def upload(client, user, space, count: int) -> str:
    articles = [{"title": f"A{i}", "content": f"Tekst {i}."} for i in range(count)]
    r = client.post(f"/spaces/{space}/articles", json={"articles": articles}, headers=user.headers)
    assert r.status_code == 202, r.text
    return r.json()["job_id"]


def events(lines) -> list[tuple[str, dict]]:
    """Parse an SSE stream into (event, data) pairs until it ends."""
    out, name = [], None
    for line in lines:
        if line.startswith("event: "):
            name = line.removeprefix("event: ")
        elif line.startswith("data: "):
            out.append((name, json.loads(line.removeprefix("data: "))))
    return out


def test_stream_replays_results_and_ends(client, alice, space, queued):
    job = upload(client, alice, space, 2)
    for q in queued:
        push_result(job, unchanged_result(q["article_id"], q["title"], 1, 0))

    with client.stream("GET", f"/jobs/{job}/events", headers=alice.headers) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        got = events(r.iter_lines())

    assert [name for name, _ in got] == ["start", "result", "result", "done"]
    assert got[0][1] == {"total": 2, "job_id": job}
    assert {d["article_id"] for name, d in got if name == "result"} == {
        q["article_id"] for q in queued
    }


async def test_stream_waits_for_results_still_to_come(client, alice, space, queued):
    # TestClient buffers a whole response, so the live part is read from the generator itself.
    job = upload(client, alice, space, 2)
    first, second = queued
    push_result(job, unchanged_result(first["article_id"], "A0", 1, 0))

    seen = []
    async for frame in job_events(job):
        name = frame.splitlines()[0].removeprefix("event: ")
        seen.append(name)
        if name == "result" and len(seen) == 2:
            # The second article finishes later, once the stream is waiting for it.
            asyncio.get_running_loop().call_later(
                0.3, push_result, job, unchanged_result(second["article_id"], "A1", 1, 0)
            )
    assert seen == ["start", "result", "result", "done"]


def test_cancelled_job_stream_ends(client, alice, space, queued):
    job = upload(client, alice, space, 3)
    assert client.post(f"/spaces/{space}/batches/{job}/cancel", headers=alice.headers).is_success
    with client.stream("GET", f"/jobs/{job}/events", headers=alice.headers) as r:
        got = events(r.iter_lines())
    assert [d["status"] for name, d in got if name == "result"] == ["cancelled"] * 3
    assert got[-1] == ("done", {"total": 3})


async def test_unknown_job_reports_an_error():
    frames = [frame async for frame in job_events("nie-ma-takiego")]
    assert frames == ['event: error\ndata: {"error": "job not found"}\n\n']
