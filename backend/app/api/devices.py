from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import DeviceStatus, DeviceType, User
from app.models.enums import LifecycleStatus
from app.schemas.infra import DeviceCreate, DeviceListOut, DeviceOut, DeviceUpdate
from app.services import device_service

router = APIRouter(prefix="/api/devices", tags=["devices"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("", response_model=DeviceListOut)
def list_devices(
    db: DB,
    org_id: OrgId,
    search: str | None = None,
    device_type: DeviceType | None = None,
    status: DeviceStatus | None = None,
    lifecycle_status: LifecycleStatus | None = None,
    datacenter_id: int | None = None,
    rack_id: int | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> DeviceListOut:
    return device_service.list_devices(
        db,
        org_id,
        search=search,
        device_type=device_type,
        status_filter=status,
        lifecycle_filter=lifecycle_status,
        datacenter_id=datacenter_id,
        rack_id=rack_id,
        page=page,
        page_size=page_size,
    )


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(device_id: int, db: DB, org_id: OrgId) -> DeviceOut:
    return device_service.get_or_404(db, org_id, device_id)


@router.post("", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
def create_device(data: DeviceCreate, db: DB, user: Engineer) -> DeviceOut:
    return device_service.create(db, user, data)


@router.put("/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: int, data: DeviceUpdate, db: DB, user: Engineer
) -> DeviceOut:
    return device_service.update(db, user, device_id, data)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: int, db: DB, user: Engineer) -> None:
    device_service.delete(db, user, device_id)
