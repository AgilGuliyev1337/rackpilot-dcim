from tests.conftest import make_infra, register_org


def _device_payload(**overrides):
    payload = {
        "name": "srv-1",
        "asset_tag": "AZT-9001",
        "serial_number": "SN-9001",
        "device_type": "server",
    }
    payload.update(overrides)
    return payload


def test_org_cannot_read_other_orgs_objects(client):
    headers_a = register_org(client, "Org A", "a@test.az")
    headers_b = register_org(client, "Org B", "b@test.az")

    infra = make_infra(client, headers_a)
    device = client.post(
        "/api/devices", json=_device_payload(), headers=headers_a
    ).json()

    for path in (
        f"/api/datacenters/{infra['datacenter_id']}",
        f"/api/rooms/{infra['room_id']}",
        f"/api/racks/{infra['rack_id']}",
        f"/api/racks/{infra['rack_id']}/layout",
        f"/api/devices/{device['id']}",
    ):
        assert client.get(path, headers=headers_b).status_code == 404, path


def test_org_lists_exclude_other_orgs_objects(client):
    headers_a = register_org(client, "Org A", "a@test.az")
    headers_b = register_org(client, "Org B", "b@test.az")

    make_infra(client, headers_a)
    client.post("/api/devices", json=_device_payload(), headers=headers_a)

    assert client.get("/api/datacenters", headers=headers_b).json() == []
    assert client.get("/api/rooms", headers=headers_b).json() == []
    assert client.get("/api/racks", headers=headers_b).json() == []
    assert client.get("/api/devices", headers=headers_b).json()["total"] == 0


def test_org_cannot_modify_other_orgs_objects(client):
    headers_a = register_org(client, "Org A", "a@test.az")
    headers_b = register_org(client, "Org B", "b@test.az")

    infra = make_infra(client, headers_a)
    device = client.post(
        "/api/devices", json=_device_payload(), headers=headers_a
    ).json()

    r = client.put(
        f"/api/datacenters/{infra['datacenter_id']}",
        json={"name": "Hacked"},
        headers=headers_b,
    )
    assert r.status_code == 404
    r = client.delete(f"/api/devices/{device['id']}", headers=headers_b)
    assert r.status_code == 404

    # still intact for org A
    r = client.get(f"/api/devices/{device['id']}", headers=headers_a)
    assert r.status_code == 200
    assert r.json()["name"] == "srv-1"


def test_cannot_create_in_other_orgs_rack(client):
    headers_a = register_org(client, "Org A", "a@test.az")
    headers_b = register_org(client, "Org B", "b@test.az")

    infra = make_infra(client, headers_a)
    r = client.post(
        "/api/devices",
        json=_device_payload(rack_id=infra["rack_id"], position_u=1),
        headers=headers_b,
    )
    assert r.status_code == 404
