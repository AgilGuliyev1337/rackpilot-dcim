from tests.conftest import make_infra, register_org


def _device(n: int, **overrides):
    payload = {
        "name": f"srv-{n}",
        "asset_tag": f"AZT-{n:04d}",
        "serial_number": f"SN-{n:04d}",
        "device_type": "server",
    }
    payload.update(overrides)
    return payload


def test_overlapping_position_returns_409(client):
    headers = register_org(client, "Rack Org", "rack@test.az")
    rack_id = make_infra(client, headers)["rack_id"]

    r = client.post(
        "/api/devices",
        json=_device(1, rack_id=rack_id, position_u=10, height_u=2),
        headers=headers,
    )
    assert r.status_code == 201

    # overlaps U11 (occupied U10-U11)
    r = client.post(
        "/api/devices",
        json=_device(2, rack_id=rack_id, position_u=11, height_u=1),
        headers=headers,
    )
    assert r.status_code == 409

    # overlaps from below: U9-U10
    r = client.post(
        "/api/devices",
        json=_device(3, rack_id=rack_id, position_u=9, height_u=2),
        headers=headers,
    )
    assert r.status_code == 409

    # adjacent above (U12) is fine
    r = client.post(
        "/api/devices",
        json=_device(4, rack_id=rack_id, position_u=12, height_u=1),
        headers=headers,
    )
    assert r.status_code == 201


def test_device_must_fit_within_rack_height(client):
    headers = register_org(client, "Fit Org", "fit@test.az")
    rack_id = make_infra(client, headers)["rack_id"]

    # rack is 42U: U41 + 4U = U41-U44 -> does not fit
    r = client.post(
        "/api/devices",
        json=_device(1, rack_id=rack_id, position_u=41, height_u=4),
        headers=headers,
    )
    assert r.status_code == 409

    # exact top fit U41-U42 is fine
    r = client.post(
        "/api/devices",
        json=_device(2, rack_id=rack_id, position_u=41, height_u=2),
        headers=headers,
    )
    assert r.status_code == 201


def test_update_into_conflict_returns_409(client):
    headers = register_org(client, "Move Org", "move@test.az")
    rack_id = make_infra(client, headers)["rack_id"]

    client.post(
        "/api/devices",
        json=_device(1, rack_id=rack_id, position_u=1, height_u=2),
        headers=headers,
    )
    d2 = client.post(
        "/api/devices",
        json=_device(2, rack_id=rack_id, position_u=5, height_u=1),
        headers=headers,
    ).json()

    r = client.put(
        f"/api/devices/{d2['id']}", json={"position_u": 2}, headers=headers
    )
    assert r.status_code == 409

    # moving to a free slot works, and a device may keep its own position
    r = client.put(
        f"/api/devices/{d2['id']}", json={"position_u": 3}, headers=headers
    )
    assert r.status_code == 200
    r = client.put(f"/api/devices/{d2['id']}", json={"notes": "same spot"}, headers=headers)
    assert r.status_code == 200
