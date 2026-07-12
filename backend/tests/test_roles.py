import pytest

from app.models import UserRole
from tests.conftest import create_user_with_role, make_infra, register_org


@pytest.fixture
def org(client, db):
    """One org with admin/engineer/viewer users and a dc/room/rack chain."""
    admin_headers = register_org(client, "Role Org", "roleadmin@test.az")
    org_id = client.get("/api/auth/me", headers=admin_headers).json()["organization_id"]
    engineer_headers = create_user_with_role(
        db, client, org_id, "roleeng@test.az", UserRole.engineer
    )
    viewer_headers = create_user_with_role(
        db, client, org_id, "roleview@test.az", UserRole.viewer
    )
    infra = make_infra(client, admin_headers)
    return {
        "admin": admin_headers,
        "engineer": engineer_headers,
        "viewer": viewer_headers,
        **infra,
    }


def test_viewer_can_read(client, org):
    assert client.get("/api/datacenters", headers=org["viewer"]).status_code == 200
    assert client.get("/api/devices", headers=org["viewer"]).status_code == 200
    assert client.get("/api/dashboard", headers=org["viewer"]).status_code == 200
    assert (
        client.get(f"/api/racks/{org['rack_id']}/layout", headers=org["viewer"]).status_code
        == 200
    )


def test_viewer_gets_403_on_mutations(client, org):
    v = org["viewer"]
    assert (
        client.post("/api/datacenters", json={"name": "X"}, headers=v).status_code == 403
    )
    assert (
        client.post(
            "/api/rooms", json={"name": "X", "datacenter_id": org["datacenter_id"]},
            headers=v,
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/racks", json={"name": "X", "room_id": org["room_id"]}, headers=v
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/devices",
            json={"name": "X", "asset_tag": "T1", "serial_number": "S1",
                  "device_type": "server"},
            headers=v,
        ).status_code
        == 403
    )
    assert (
        client.put(
            f"/api/datacenters/{org['datacenter_id']}", json={"name": "Y"}, headers=v
        ).status_code
        == 403
    )
    assert (
        client.delete(f"/api/racks/{org['rack_id']}", headers=v).status_code == 403
    )


def test_engineer_can_mutate(client, org):
    e = org["engineer"]
    r = client.post("/api/datacenters", json={"name": "Eng DC"}, headers=e)
    assert r.status_code == 201
    dc_id = r.json()["id"]
    assert (
        client.put(f"/api/datacenters/{dc_id}", json={"name": "Eng DC 2"}, headers=e).status_code
        == 200
    )
    assert client.delete(f"/api/datacenters/{dc_id}", headers=e).status_code == 204


def test_admin_can_mutate(client, org):
    r = client.post("/api/datacenters", json={"name": "Admin DC"}, headers=org["admin"])
    assert r.status_code == 201


def test_mutations_write_audit_logs(client, org):
    logs = client.get("/api/dashboard", headers=org["admin"]).json()["recent_audit_logs"]
    # dc + room + rack from the fixture
    assert len(logs) >= 3
    assert {log["action"] for log in logs} == {"create"}
    assert {log["entity_type"] for log in logs} >= {"datacenter", "room", "rack"}
