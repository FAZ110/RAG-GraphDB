import pytest

from services.auth.bootstrap import DEV_ACCOUNTS, ensure_dev_accounts
from tests.integration.conftest import cypher

LOCAL = ["http://localhost:5173", "http://127.0.0.1:5173"]


def emails() -> list[str]:
    return [r["e"] for r in cypher("MATCH (u:User) RETURN u.email AS e ORDER BY e")]


def test_creates_the_test_accounts_once(client):
    # Through the client's portal: the shared Neo4j driver lives on that event loop.
    client.portal.call(ensure_dev_accounts, True, LOCAL)
    client.portal.call(ensure_dev_accounts, True, LOCAL)
    assert emails() == sorted(a["email"] for a in DEV_ACCOUNTS)
    roles = cypher("MATCH (u:User {email: 'admin@atlas.test'}) RETURN u.role AS r")
    assert roles == [{"r": "admin"}]


def test_dev_login_is_off_by_default(client):
    r = client.post("/auth/dev-login", json={"email": "anna@atlas.test"})
    assert r.status_code == 404
    assert client.get("/auth/config").json()["dev_accounts"] == []


@pytest.fixture
def dev_mode(client, monkeypatch):
    monkeypatch.setattr("api.auth.DEV_ACCOUNTS", True)
    client.portal.call(ensure_dev_accounts, True, LOCAL)


def test_dev_login_signs_in_a_test_account(client, dev_mode):
    r = client.post("/auth/dev-login", json={"email": "anna@atlas.test"})
    assert r.status_code == 200
    assert r.json()["email"] == "anna@atlas.test"
    assert client.get("/auth/me").status_code == 200
    assert len(client.get("/auth/config").json()["dev_accounts"]) == 3


def test_dev_login_refuses_other_accounts(client, dev_mode, alice):
    # A real account never signs in without its password, even in dev mode.
    assert client.post("/auth/dev-login", json={"email": alice.email}).status_code == 404


def test_dev_login_refuses_a_blocked_test_account(client, dev_mode):
    cypher("MATCH (u:User {email: 'jan@atlas.test'}) SET u.disabled = true")
    assert client.post("/auth/dev-login", json={"email": "jan@atlas.test"}).status_code == 403
