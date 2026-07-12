from app.core import ratelimit
from tests.conftest import PASSWORD, register_org


def test_logout_revokes_existing_tokens(client):
    register_org(client, "Rev Org", "rev@test.az")
    tokens = client.post(
        "/api/auth/login", json={"email": "rev@test.az", "password": PASSWORD}
    ).json()
    h = {"Authorization": f"Bearer {tokens['access_token']}"}

    assert client.get("/api/auth/me", headers=h).status_code == 200
    assert client.post("/api/auth/logout", headers=h).status_code == 204
    # the same token is now revoked (token_version bumped)
    assert client.get("/api/auth/me", headers=h).status_code == 401
    # and the old refresh token is dead too
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401


def test_weak_password_rejected(client):
    for pw in ["short", "alllettersnodigit", "12345678"]:
        r = client.post(
            "/api/auth/register",
            json={
                "organization_name": "Weak",
                "email": f"weak-{pw}@test.az",
                "password": pw,
                "full_name": "Weak",
            },
        )
        assert r.status_code == 422, pw


def test_login_rate_limited_after_failures(client):
    email = "brute@test.az"
    register_org(client, "Brute Org", email)
    ratelimit.reset(f"testclient:{email}")
    # exhaust the failure budget with wrong passwords
    for _ in range(ratelimit.MAX_ATTEMPTS):
        r = client.post("/api/auth/login", json={"email": email, "password": "wrong-pass1"})
        assert r.status_code == 401
    # next attempt is throttled, even with the correct password
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 429
    ratelimit.reset(f"testclient:{email}")


def test_successful_login_resets_rate_limit(client):
    email = "ok@test.az"
    register_org(client, "OK Org", email)
    ratelimit.reset(f"testclient:{email}")
    for _ in range(3):
        client.post("/api/auth/login", json={"email": email, "password": "nope1234"})
    # a correct login clears the failure count
    assert client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200
    for _ in range(ratelimit.MAX_ATTEMPTS - 1):
        client.post("/api/auth/login", json={"email": email, "password": "nope1234"})
    # still under the limit because the counter was reset
    assert client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200
