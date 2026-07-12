from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import User
from app.schemas.infra import DeviceOut
from app.services import code_service, device_service, photo_service
from app.services.audit_service import entity_to_dict, log_action

router = APIRouter(prefix="/api/devices", tags=["device-photos"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("/{device_id}/qrcode")
def device_qrcode(device_id: int, db: DB, org_id: OrgId) -> Response:
    device = device_service.get_or_404(db, org_id, device_id)
    url = f"{settings.frontend_base_url}/assets/{device.id}"
    return Response(
        content=code_service.qr_png(url),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="device-{device.id}-qr.png"'},
    )


@router.get("/{device_id}/barcode")
def device_barcode(device_id: int, db: DB, org_id: OrgId) -> Response:
    device = device_service.get_or_404(db, org_id, device_id)
    return Response(
        content=code_service.barcode_png(device.asset_tag),
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="device-{device.id}-barcode.png"'
        },
    )

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

Side = Literal["front", "back"]


def _field_for(side: Side) -> str:
    return "photo_front_url" if side == "front" else "photo_back_url"


@router.post("/{device_id}/photo", response_model=DeviceOut)
async def upload_photo(
    device_id: int,
    file: UploadFile,
    db: DB,
    user: Engineer,
    org_id: OrgId,
    side: Side = "front",
) -> DeviceOut:
    device = device_service.get_or_404(db, org_id, device_id)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only JPEG, PNG and WEBP images are supported"
        )
    content = await file.read()

    field = _field_for(side)
    old = entity_to_dict(device)
    old_url = getattr(device, field)
    new_url = photo_service.save_device_photo(device_id, content, side)
    setattr(device, field, new_url)
    db.flush()
    log_action(
        db,
        user=user,
        action="update",
        entity_type="device",
        entity_id=device.id,
        entity_name=device.name,
        old_values=old,
        new_values=entity_to_dict(device),
    )
    db.commit()
    db.refresh(device)
    if old_url and old_url != new_url:
        photo_service.delete_photo_file(old_url)
    return device


@router.delete("/{device_id}/photo", response_model=DeviceOut)
def delete_photo(
    device_id: int, db: DB, user: Engineer, org_id: OrgId, side: Side = "front"
) -> DeviceOut:
    device = device_service.get_or_404(db, org_id, device_id)
    field = _field_for(side)
    old_url = getattr(device, field)
    if not old_url:
        return device
    old = entity_to_dict(device)
    setattr(device, field, None)
    db.flush()
    log_action(
        db,
        user=user,
        action="update",
        entity_type="device",
        entity_id=device.id,
        entity_name=device.name,
        old_values=old,
        new_values=entity_to_dict(device),
    )
    db.commit()
    db.refresh(device)
    photo_service.delete_photo_file(old_url)
    return device
