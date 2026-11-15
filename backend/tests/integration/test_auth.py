from tests.integration.conftest import session_token

WRONG = "Nieprawidłowy e-mail lub hasło"


def login(client, email: str, password: str):
    r = client.post("/auth/login", json={"email": email, "password": password})
    client.cookies.clear()
    return r


def test_register_sets_httponly_cookie_and_lowercases_email(client):
    r = client.post(
        "/auth/register", json={"email": " Ala@Example.COM ", "password": "dlugie-haslo-1"}
    )
    assert r.status_code == 201
    assert r.json()["email"] == "ala@example.com"
    assert "httponly" in r.headers["set-cookie"].lower()


def test_new_account_has_no_server_models_until_admin_grants(client, admin):
    r = client.post("/auth/register", json={"email": "n@example.com", "password": "dlugie-haslo-1"})
    client.cookies.clear()
    assert r.json()["server_models"] is False
    user_id = r.json()["id"]
    r = client.patch(f"/admin/users/{user_id}", json={"server_models": True}, headers=admin.headers)
    assert r.status_code == 200 and r.json()["server_models"] is True


def test_register_duplicate_email_409(client, alice):
    r = client.post("/auth/register", json={"email": alice.email, "password": "inne-haslo-12"})
    assert r.status_code == 409


def test_register_rejects_password_equal_to_email(client):
    email = "dlugiadres@example.com"
    r = client.post("/auth/register", json={"email": email, "password": email})
    assert r.status_code == 422


def test_register_rejects_short_password(client):
    r = client.post("/auth/register", json={"email": "a@example.com", "password": "krotkie"})
    assert r.status_code == 422


def test_register_closed_by_admin_403(client, admin):
    r = client.put("/admin/settings", json={"registration_open": False}, headers=admin.headers)
    assert r.status_code == 200
    r = client.post("/auth/register", json={"email": "n@example.com", "password": "dlugie-haslo-1"})
    assert r.status_code == 403


def test_login_with_right_password(client, alice):
    r = login(client, alice.email, alice.password)
    assert r.status_code == 200
    assert r.json()["id"] == alice.id


def test_login_wrong_password_and_unknown_email_same_401(client, alice):
    wrong_password = login(client, alice.email, "zle-haslo-123")
    unknown = login(client, "nikt@example.com", "zle-haslo-123")
    assert wrong_password.status_code == unknown.status_code == 401
    assert wrong_password.json()["detail"] == unknown.json()["detail"] == WRONG


def test_login_locked_after_5_failures_even_with_right_password(client, alice):
    for _ in range(5):
        assert login(client, alice.email, "zle-haslo-123").status_code == 401
    r = login(client, alice.email, alice.password)
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) > 0


def test_me_requires_session(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_session(client, alice):
    r = client.get("/auth/me", headers=alice.headers)
    assert r.status_code == 200
    assert r.json()["email"] == alice.email


def test_logout_invalidates_token(client, alice):
    assert client.post("/auth/logout", headers=alice.headers).status_code == 204
    assert client.get("/auth/me", headers=alice.headers).status_code == 401


def test_password_change_wrong_current_400(client, alice):
    body = {"current_password": "zle-haslo-123", "new_password": "nowe-haslo-123"}
    assert client.post("/auth/password", json=body, headers=alice.headers).status_code == 400


def test_password_change_ends_old_sessions(client, alice):
    body = {"current_password": alice.password, "new_password": "nowe-haslo-123"}
    r = client.post("/auth/password", json=body, headers=alice.headers)
    assert r.status_code == 204
    new_headers = {"Cookie": f"atlas_session={session_token(r)}"}
    client.cookies.clear()
    assert client.get("/auth/me", headers=alice.headers).status_code == 401
    assert client.get("/auth/me", headers=new_headers).status_code == 200
    assert login(client, alice.email, "nowe-haslo-123").status_code == 200
    assert login(client, alice.email, alice.password).status_code == 401


def test_disabled_user_cannot_login_and_loses_session(client, admin, alice):
    r = client.patch(f"/admin/users/{alice.id}", json={"disabled": True}, headers=admin.headers)
    assert r.status_code == 200
    assert client.get("/auth/me", headers=alice.headers).status_code == 401
    assert login(client, alice.email, alice.password).status_code == 403


def test_admin_cannot_disable_self(client, admin):
    r = client.patch(f"/admin/users/{admin.id}", json={"disabled": True}, headers=admin.headers)
    assert r.status_code >= 400
    assert client.get("/auth/me", headers=admin.headers).status_code == 200


def test_non_admin_gets_403_on_admin(client, alice):
    assert client.get("/admin/users", headers=alice.headers).status_code == 403


def test_admin_lists_users(client, admin, alice):
    r = client.get("/admin/users", headers=admin.headers)
    assert r.status_code == 200
    assert {u["email"] for u in r.json()} == {admin.email, alice.email}


def test_foreign_origin_blocked_for_post_but_not_get(client, alice):
    evil = {**alice.headers, "Origin": "https://evil.example"}
    assert client.post("/spaces", json={"name": "x"}, headers=evil).status_code == 403
    assert client.get("/spaces", headers=evil).status_code == 200


def test_security_headers_present(client):
    r = client.get("/")
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["cache-control"] == "no-store"


def test_registration_limited_per_ip(client):
    for i in range(5):
        r = client.post(
            "/auth/register", json={"email": f"u{i}@example.com", "password": "dlugie-haslo-1"}
        )
        assert r.status_code == 201
        client.cookies.clear()
    r = client.post(
        "/auth/register", json={"email": "u5@example.com", "password": "dlugie-haslo-1"}
    )
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) > 0


def test_failed_registrations_count_towards_the_limit(client, alice):
    # A taken address still uses up an attempt, so the limit can't be dodged by probing.
    for _ in range(4):
        body = {"email": alice.email, "password": "dlugie-haslo-1"}
        assert client.post("/auth/register", json=body).status_code == 409
    r = client.post("/auth/register", json={"email": "n@example.com", "password": "dlugie-haslo-1"})
    assert r.status_code == 429


def test_password_change_locked_after_5_wrong_attempts(client, alice):
    wrong = {"current_password": "zle-haslo-123", "new_password": "nowe-haslo-123"}
    for _ in range(5):
        assert client.post("/auth/password", json=wrong, headers=alice.headers).status_code == 400
    right = {"current_password": alice.password, "new_password": "nowe-haslo-123"}
    assert client.post("/auth/password", json=right, headers=alice.headers).status_code == 429
    assert login(client, alice.email, alice.password).status_code == 200


def test_successful_login_resets_the_email_limit(client, alice):
    for _ in range(4):
        assert login(client, alice.email, "zle-haslo-123").status_code == 401
    assert login(client, alice.email, alice.password).status_code == 200
    for _ in range(4):
        assert login(client, alice.email, "zle-haslo-123").status_code == 401
    assert login(client, alice.email, alice.password).status_code == 200
