from app.models import UserRole
from tests.conftest import create_user_with_role, make_infra, register_org


def _warehouse(client, headers, name="WH1"):
    r = client.post("/api/warehouses", json={"name": name, "location": "Baku"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def _item(client, headers, wid, sku="SKU-1", qty=10, threshold=5):
    r = client.post(
        "/api/stock-items",
        json={"name": "SFP", "sku": sku, "category": "transceiver", "quantity": qty,
              "min_threshold": threshold, "unit": "pcs", "warehouse_id": wid},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_warehouse_crud_and_detail(client):
    headers = register_org(client, "WH Org", "wh@test.az")
    wh = _warehouse(client, headers)
    _item(client, headers, wh["id"])
    detail = client.get(f"/api/warehouses/{wh['id']}", headers=headers).json()
    assert len(detail["stock_items"]) == 1
    assert detail["devices"] == []


def test_movements_update_quantity_and_history(client):
    headers = register_org(client, "Mv Org", "mv@test.az")
    wh = _warehouse(client, headers)
    item = _item(client, headers, wh["id"], qty=10)

    r = client.post(f"/api/stock-items/{item['id']}/movement",
                    json={"movement_type": "issued", "quantity": 4}, headers=headers)
    assert r.status_code == 200 and r.json()["quantity"] == 6

    r = client.post(f"/api/stock-items/{item['id']}/movement",
                    json={"movement_type": "received", "quantity": 10}, headers=headers)
    assert r.json()["quantity"] == 16

    mv = client.get(f"/api/stock-items/{item['id']}/movements", headers=headers).json()
    assert mv["total"] == 2
    assert mv["items"][0]["resulting_quantity"] == 16


def test_cannot_issue_below_zero(client):
    headers = register_org(client, "Neg Org", "neg@test.az")
    wh = _warehouse(client, headers)
    item = _item(client, headers, wh["id"], qty=3)
    r = client.post(f"/api/stock-items/{item['id']}/movement",
                    json={"movement_type": "issued", "quantity": 5}, headers=headers)
    assert r.status_code == 409


def test_duplicate_sku_rejected(client):
    headers = register_org(client, "Sku Org", "sku@test.az")
    wh = _warehouse(client, headers)
    _item(client, headers, wh["id"], sku="DUP-1")
    r = client.post(
        "/api/stock-items",
        json={"name": "x", "sku": "DUP-1", "category": "other", "min_threshold": 0,
              "unit": "pcs", "warehouse_id": wh["id"]},
        headers=headers,
    )
    assert r.status_code == 409


def test_low_stock_on_dashboard(client):
    headers = register_org(client, "Low Org", "low@test.az")
    wh = _warehouse(client, headers)
    _item(client, headers, wh["id"], sku="LOW-1", qty=2, threshold=5)
    d = client.get("/api/dashboard", headers=headers).json()
    assert any(s["sku"] == "LOW-1" for s in d["low_stock"])


def test_device_move_to_warehouse_clears_rack(client):
    headers = register_org(client, "Loc Org", "loc@test.az")
    infra = make_infra(client, headers)
    wh = _warehouse(client, headers)
    dev = client.post(
        "/api/devices",
        json={"name": "srv", "asset_tag": "A1", "serial_number": "S1",
              "device_type": "server", "rack_id": infra["rack_id"], "position_u": 1},
        headers=headers,
    ).json()
    assert dev["rack_id"] == infra["rack_id"]

    moved = client.put(f"/api/devices/{dev['id']}",
                       json={"warehouse_id": wh["id"]}, headers=headers).json()
    assert moved["warehouse_id"] == wh["id"]
    assert moved["rack_id"] is None and moved["position_u"] is None

    # no longer occupies the rack
    layout = client.get(f"/api/racks/{infra['rack_id']}/layout", headers=headers).json()
    assert all(not u["occupied"] for u in layout["units"])


def test_rack_and_warehouse_together_rejected(client):
    headers = register_org(client, "Both Org", "both@test.az")
    infra = make_infra(client, headers)
    wh = _warehouse(client, headers)
    r = client.post(
        "/api/devices",
        json={"name": "srv", "asset_tag": "A1", "serial_number": "S1",
              "device_type": "server", "rack_id": infra["rack_id"], "warehouse_id": wh["id"]},
        headers=headers,
    )
    assert r.status_code == 409


def test_warehouse_requires_engineer(client, db):
    headers = register_org(client, "WhRole", "whrole@test.az")
    org_id = client.get("/api/auth/me", headers=headers).json()["organization_id"]
    viewer = create_user_with_role(db, client, org_id, "whview@test.az", UserRole.viewer)
    assert client.post("/api/warehouses", json={"name": "x"}, headers=viewer).status_code == 403
