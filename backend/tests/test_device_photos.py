import io

from PIL import Image

from app.models import UserRole
from tests.conftest import create_user_with_role, make_infra, register_org


def _make_device(client, headers):
    infra = make_infra(client, headers)
    r = client.post(
        "/api/devices",
        json={
            "name": "photo-dev",
            "asset_tag": "AZT-PH01",
            "serial_number": "SN-PH01",
            "device_type": "server",
            "rack_id": infra["rack_id"],
            "position_u": 1,
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _png_bytes(width=1600, height=800) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (20, 100, 180)).save(buf, "PNG")
    return buf.getvalue()


def test_upload_resizes_and_sets_url(client):
    headers = register_org(client, "Photo Org", "photo@test.az")
    device = _make_device(client, headers)

    r = client.post(
        f"/api/devices/{device['id']}/photo",
        headers=headers,
        files={"file": ("wide.png", _png_bytes(1600, 800), "image/png")},
    )
    assert r.status_code == 200, r.text
    url = r.json()["photo_front_url"]
    assert url and url.startswith("/uploads/devices/")

    served = client.get(url)
    assert served.status_code == 200
    img = Image.open(io.BytesIO(served.content))
    assert img.width == 1200  # resized down from 1600


def test_front_and_back_are_independent(client):
    headers = register_org(client, "Sides Org", "sides@test.az")
    device = _make_device(client, headers)
    did = device["id"]

    front = client.post(
        f"/api/devices/{did}/photo?side=front",
        headers=headers,
        files={"file": ("f.png", _png_bytes(400, 400), "image/png")},
    ).json()
    assert front["photo_front_url"] and front["photo_back_url"] is None

    both = client.post(
        f"/api/devices/{did}/photo?side=back",
        headers=headers,
        files={"file": ("b.png", _png_bytes(400, 400), "image/png")},
    ).json()
    assert both["photo_front_url"] and both["photo_back_url"]
    assert both["photo_front_url"] != both["photo_back_url"]

    # deleting the back leaves the front intact
    after = client.delete(f"/api/devices/{did}/photo?side=back", headers=headers).json()
    assert after["photo_front_url"] and after["photo_back_url"] is None


def test_upload_rejects_non_image(client):
    headers = register_org(client, "Bad Photo", "badphoto@test.az")
    device = _make_device(client, headers)
    r = client.post(
        f"/api/devices/{device['id']}/photo",
        headers=headers,
        files={"file": ("fake.png", b"this is not an image", "image/png")},
    )
    assert r.status_code == 400


def test_delete_photo_clears_url(client):
    headers = register_org(client, "Del Photo", "delphoto@test.az")
    device = _make_device(client, headers)
    client.post(
        f"/api/devices/{device['id']}/photo",
        headers=headers,
        files={"file": ("p.png", _png_bytes(), "image/png")},
    )
    r = client.delete(f"/api/devices/{device['id']}/photo", headers=headers)
    assert r.status_code == 200
    assert r.json()["photo_front_url"] is None


def test_viewer_cannot_upload(client, db):
    headers = register_org(client, "RolePhoto", "rolephoto@test.az")
    org_id = client.get("/api/auth/me", headers=headers).json()["organization_id"]
    device = _make_device(client, headers)
    viewer = create_user_with_role(db, client, org_id, "vphoto@test.az", UserRole.viewer)
    r = client.post(
        f"/api/devices/{device['id']}/photo",
        headers=viewer,
        files={"file": ("p.png", _png_bytes(), "image/png")},
    )
    assert r.status_code == 403
