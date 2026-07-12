from tests.conftest import PASSWORD, register_org


def test_register_creates_org_and_admin(client):
    r = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Acme Telecom",
            "email": "admin@acme.az",
            "password": PASSWORD,
            "full_name": "Acme Admin",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["role"] == "admin"
    assert body["organization_id"] > 0


def test_register_duplicate_email_conflict(client):
    register_org(client, "Org One", "dup@test.az")
    r = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Org Two",
            "email": "dup@test.az",
            "password": PASSWORD,
            "full_name": "Dup",
        },
    )
    assert r.status_code == 409


def test_login_refresh_me_flow(client):
    register_org(client, "Flow Org", "flow@test.az")

    r = client.post("/api/auth/login", json={"email": "flow@test.az", "password": PASSWORD})
    assert r.status_code == 200
    tokens = r.json()
    assert tokens["token_type"] == "bearer"

    r = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert r.status_code == 200
    assert r.json()["email"] == "flow@test.az"

    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    new_access = r.json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert r.status_code == 200


def test_login_wrong_password(client):
    register_org(client, "Wrong Org", "wrong@test.az")
    r = client.post("/api/auth/login", json={"email": "wrong@test.az", "password": "bad-password"})
    assert r.status_code == 401


def test_refresh_rejects_access_token(client):
    register_org(client, "Type Org", "type@test.az")
    tokens = client.post(
        "/api/auth/login", json={"email": "type@test.az", "password": PASSWORD}
    ).json()
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401
    assert (
        client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"}).status_code
        == 401
    )
