from app.services import assistant_service
from tests.conftest import make_infra, register_org


def test_status_and_ask_not_configured(client):
    headers = register_org(client, "AI Org", "ai@test.az")
    # tests run without OPENROUTER_API_KEY set
    assert client.get("/api/assistant/status", headers=headers).json()["configured"] is False

    r = client.post(
        "/api/assistant/ask", json={"question": "which racks have space?"}, headers=headers
    )
    assert r.status_code == 200
    body = r.json()
    assert body["configured"] is False
    assert "not configured" in body["answer"].lower()


def test_ask_requires_auth(client):
    assert client.post("/api/assistant/ask", json={"question": "hi"}).status_code == 401


def test_context_is_tenant_scoped(client, db):
    from app.core.deps import get_current_user  # noqa: F401  (ensures app import)
    from app.models import Organization
    from sqlalchemy import select

    ha = register_org(client, "Org A ctx", "actx@test.az")
    hb = register_org(client, "Org B ctx", "bctx@test.az")
    make_infra(client, ha)
    client.post(
        "/api/devices",
        json={"name": "secret-a", "asset_tag": "SEC-A", "serial_number": "SN-SECA",
              "device_type": "server"},
        headers=ha,
    )
    org_b = db.scalar(select(Organization).where(Organization.name == "Org B ctx"))

    context = assistant_service.build_context(db, org_b.id)
    # org B's context must not mention org A's device
    assert "secret-a" not in context
    assert "SEC-A" not in context
