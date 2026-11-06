import copy
import hashlib
import json
import os
from dataclasses import dataclass
from urllib.parse import urlsplit

import pytest
import redis
from fastapi.testclient import TestClient

from core.config import NEO4J_URI, REDIS_URL
from db.driver import get_sync_driver
from main import app
from services.auth.sessions import SESSION_COOKIE
from services.dedup import normalize_name

ORIGIN = "http://localhost:5173"


def pytest_collection_modifyitems(items):
    for item in items:
        if "integration" in item.path.parts:
            item.add_marker(pytest.mark.integration)


@dataclass
class TestUser:
    __test__ = False

    id: str
    email: str
    password: str
    token: str

    @property
    def headers(self) -> dict:
        return {"Cookie": f"{SESSION_COOKIE}={self.token}"}


def cypher(query: str, **params) -> list[dict]:
    with get_sync_driver().session() as session:
        return [r.data() for r in session.run(query, params)]


def session_token(response) -> str:
    return response.cookies[SESSION_COOKIE]


# One client for the whole run: the async Neo4j driver and the Redis client are bound to
# the event loop of this client's portal, so a second client would run on another loop.
@pytest.fixture(scope="session")
def client():
    # Every test wipes the database: refuse anything but the test container, or CI's own one.
    if urlsplit(NEO4J_URI).port != 7688 and not os.getenv("CI"):
        pytest.exit(f"Refusing to wipe {NEO4J_URI}: tests run only against port 7688", 2)
    with TestClient(app, headers={"Origin": ORIGIN}) as c:
        yield c


@pytest.fixture(autouse=True)
def clean_db(client):
    cypher("MATCH (n) DETACH DELETE n")
    redis.from_url(REDIS_URL).flushdb()
    client.cookies.clear()
    yield
    client.cookies.clear()


@pytest.fixture
def make_user(client):
    def make(email: str, password: str = "poprawne-haslo-1", role: str = "user") -> TestUser:
        r = client.post("/auth/register", json={"email": email, "password": password})
        assert r.status_code == 201, r.text
        client.cookies.clear()
        user_id = r.json()["id"]
        # As if an admin had granted the server models, which most tests extract with.
        cypher(
            "MATCH (u:User {id: $id}) SET u.role = $role, u.server_models = true",
            id=user_id,
            role=role,
        )
        return TestUser(user_id, email, password, session_token(r))

    return make


@pytest.fixture
def alice(make_user) -> TestUser:
    return make_user("alice@example.com")


@pytest.fixture
def bob(make_user) -> TestUser:
    return make_user("bob@example.com")


@pytest.fixture
def admin(make_user) -> TestUser:
    return make_user("admin@example.com", role="admin")


@pytest.fixture
def space(client, alice) -> str:
    r = client.post("/spaces", json={"name": "Przestrzeń"}, headers=alice.headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.fixture
def queued(monkeypatch) -> list[dict]:
    """Records what would go to the broker, in place of Celery."""
    calls: list[dict] = []

    def queue_extraction(job_id, article_id, title, provider, token):
        calls.append(
            {
                "job_id": job_id,
                "article_id": article_id,
                "title": title,
                "provider": provider,
                "token": token,
            }
        )

    monkeypatch.setattr("services.jobs.extraction.queue_extraction", queue_extraction)
    monkeypatch.setattr(
        "services.jobs.extraction.drop_queued", lambda tokens: calls.append({"dropped": tokens})
    )
    return calls


class FakeLLM:
    """Returns a fixed graph in place of the model; patched in as tasks.extract_task.LLMService."""

    def __init__(self, graph: dict) -> None:
        self.graph = graph
        self.calls: list[dict] = []
        # Runs while the "LLM" works, to change the article mid-extraction.
        self.during = None

    def generate_graph_json(self, title, content, rules=None, labels=None) -> dict:
        self.calls.append({"title": title, "content": content, "rules": rules, "labels": labels})
        if self.during:
            self.during()
        return copy.deepcopy(self.graph)


@pytest.fixture
def extract(client, alice, queued, monkeypatch):
    """Upload an article to a space and run the worker on it with `graph` as the LLM's answer;
    returns the article id."""
    llm = FakeLLM({})
    monkeypatch.setattr("tasks.extract_task.LLMService", lambda provider, owner_id: llm)

    def run(space: str, text: str, graph: dict, url: str, title: str = "Artykuł", user=None):
        from tasks.extract_task import _run_extraction

        llm.graph = graph
        body = {"articles": [{"title": title, "url": url, "content": text}]}
        r = client.post(f"/spaces/{space}/articles", json=body, headers=(user or alice).headers)
        assert r.status_code == 202, r.text
        task = queued[-1]
        result = _run_extraction(task["job_id"], task["article_id"], "local", task["token"])
        assert result["status"] == "ok", result
        return task["article_id"]

    return run


class FakeEmbedder:
    """Deterministic 8-dim vectors: the same text gives the same vector, no network."""

    def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(normalize_name(text).encode()).digest()
        return [b / 255 + 0.01 for b in digest[:8]]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]


@pytest.fixture(autouse=True)
def fake_embedder(monkeypatch) -> FakeEmbedder:
    # Every caller goes through get_embedding_service(), which returns this singleton.
    fake = FakeEmbedder()
    monkeypatch.setattr("services.embedding_service._service", fake)
    return fake


def job_results(job_id: str) -> list[dict]:
    raw = redis.from_url(REDIS_URL).lrange(f"job:{job_id}:results", 0, -1)
    return [json.loads(r) for r in raw]


def article_status(article_id: str) -> str:
    return cypher("MATCH (a:Article {id: $id}) RETURN a.status AS s", id=article_id)[0]["s"]
