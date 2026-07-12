from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import DeviceStatus, DeviceType, User
from app.services import import_export_service
from app.services.import_export_service import ImportResult

# NOTE: must be registered BEFORE the devices router so /export, /import and
# /import/template are not swallowed by GET /api/devices/{device_id}.
router = APIRouter(prefix="/api/devices", tags=["devices-io"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@router.get("/export")
def export_devices(
    db: DB,
    org_id: OrgId,
    format: Literal["csv", "xlsx"] = "csv",
    device_type: DeviceType | None = None,
    status: DeviceStatus | None = None,
    datacenter_id: int | None = None,
) -> Response:
    content, media_type, filename = import_export_service.export_devices(
        db,
        org_id,
        fmt=format,
        device_type=device_type,
        status=status,
        datacenter_id=datacenter_id,
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/import/template")
def import_template(format: Literal["csv", "xlsx"] = "csv") -> Response:
    content, media_type, filename = import_export_service.build_template(format)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=ImportResult)
async def import_devices(file: UploadFile, db: DB, user: Engineer) -> ImportResult:
    filename = file.filename or "upload.csv"
    if not filename.lower().endswith((".csv", ".xlsx")):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only .csv and .xlsx files are supported"
        )
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File too large (max 5 MB)")
    return import_export_service.import_devices(db, user, filename, content)
