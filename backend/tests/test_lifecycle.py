from app.models import UserRole
from tests.conftest import create_user_with_role, register_org


def _device(client, headers, **overrides):
    payload = {
        "name": "lc-dev",
        "asset_tag": "AZT-LC01",
        "serial_number": "SN-LC01",
        "device_type": "server",
    }
    payload.update(overrides)
    r = client.post("/api/devices", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_lifecycle_forward_moves_allowed(client):
    headers = register_org(client, "LC Org", "lc@test.az")
    dev = _device(client, headers, lifecycle_status="planning")
    r = client.put(
        f"/api/devices/{dev['id']}", json={"lifecycle_status": "production"}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["lifecycle_status"] == "production"


def test_engineer_cannot_reverse_terminal(client, db):
    headers = register_org(client, "LC2 Org", "lc2@test.az")
    org_id = client.get("/api/auth/me", headers=headers).json()["organization_id"]
    eng = create_user_with_role(db, client, org_id, "lceng@test.az", UserRole.engineer)
    dev = _device(client, eng, lifecycle_status="decommissioned")
    r = client.put(
        f"/api/devices/{dev['id']}", json={"lifecycle_status": "production"}, headers=eng
    )
    assert r.status_code == 409


def test_admin_can_reverse_terminal(client):
    headers = register_org(client, "LC3 Org", "lc3@test.az")  # registrant is admin
    dev = _device(client, headers, lifecycle_status="disposed")
    r = client.put(
        f"/api/devices/{dev['id']}", json={"lifecycle_status": "production"}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["lifecycle_status"] == "production"


def test_lifecycle_filter(client):
    headers = register_org(client, "LC4 Org", "lc4@test.az")
    _device(client, headers, name="prod-a", asset_tag="A1", serial_number="S1",
            lifecycle_status="production")
    _device(client, headers, name="plan-a", asset_tag="A2", serial_number="S2",
            lifecycle_status="planning")
    r = client.get("/api/devices?lifecycle_status=planning", headers=headers)
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["name"] == "plan-a"
