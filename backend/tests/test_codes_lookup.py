from tests.conftest import register_org


def _device(client, headers, **overrides):
    payload = {
        "name": "code-dev",
        "asset_tag": "AZT-CODE1",
        "serial_number": "SN-CODE1",
        "device_type": "server",
    }
    payload.update(overrides)
    r = client.post("/api/devices", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_qrcode_and_barcode_png(client):
    headers = register_org(client, "Code Org", "code@test.az")
    dev = _device(client, headers)

    qr = client.get(f"/api/devices/{dev['id']}/qrcode", headers=headers)
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"
    assert qr.content[:8] == b"\x89PNG\r\n\x1a\n"

    bc = client.get(f"/api/devices/{dev['id']}/barcode", headers=headers)
    assert bc.status_code == 200
    assert bc.headers["content-type"] == "image/png"
    assert bc.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_lookup_resolves_asset_tag(client):
    headers = register_org(client, "Look Org", "look@test.az")
    dev = _device(client, headers, asset_tag="AZT-LOOK1")
    r = client.get("/api/lookup/AZT-LOOK1", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "device"
    assert body["id"] == dev["id"]
    assert body["identifier"] == "AZT-LOOK1"


def test_lookup_miss_returns_404(client):
    headers = register_org(client, "Miss Org", "miss@test.az")
    assert client.get("/api/lookup/NOPE-0000", headers=headers).status_code == 404


def test_lookup_is_tenant_scoped(client):
    ha = register_org(client, "Look A", "looka@test.az")
    hb = register_org(client, "Look B", "lookb@test.az")
    _device(client, ha, asset_tag="AZT-ONLYA")
    # org B cannot resolve org A's asset tag
    assert client.get("/api/lookup/AZT-ONLYA", headers=hb).status_code == 404
