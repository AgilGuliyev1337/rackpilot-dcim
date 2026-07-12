from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Device, DeviceStatus, DeviceType, Rack, Room, User
from app.models.enums import (
    LIFECYCLE_TERMINAL,
    LifecycleStatus,
    UserRole,
)
from app.schemas.infra import DeviceCreate, DeviceListOut, DeviceUpdate
from app.services import rack_service
from app.services.audit_service import entity_to_dict, log_action


def _validate_lifecycle_transition(
    old: LifecycleStatus, new: LifecycleStatus, user: User
) -> None:
    """Reversing out of a terminal stage (decommissioned/disposed) back into an
    active stage requires an admin. Everything else is allowed.
    """
    if old == new:
        return
    if old in LIFECYCLE_TERMINAL and new not in LIFECYCLE_TERMINAL:
        if user.role != UserRole.admin:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Only an admin can move a {old.value} device back to {new.value}",
            )


def get_or_404(db: Session, org_id: int, device_id: int) -> Device:
    device = db.scalar(
        select(Device).where(Device.id == device_id, Device.organization_id == org_id)
    )
    if not device:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")
    return device


def list_devices(
    db: Session,
    org_id: int,
    *,
    search: str | None = None,
    device_type: DeviceType | None = None,
    status_filter: DeviceStatus | None = None,
    lifecycle_filter: LifecycleStatus | None = None,
    datacenter_id: int | None = None,
    rack_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> DeviceListOut:
    query = select(Device).where(Device.organization_id == org_id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Device.name.ilike(pattern),
                Device.serial_number.ilike(pattern),
                Device.asset_tag.ilike(pattern),
                Device.ip_address.ilike(pattern),
            )
        )
    if device_type is not None:
        query = query.where(Device.device_type == device_type)
    if status_filter is not None:
        query = query.where(Device.status == status_filter)
    if lifecycle_filter is not None:
        query = query.where(Device.lifecycle_status == lifecycle_filter)
    if rack_id is not None:
        query = query.where(Device.rack_id == rack_id)
    if datacenter_id is not None:
        query = (
            query.join(Rack, Device.rack_id == Rack.id)
            .join(Room, Rack.room_id == Room.id)
            .where(Room.datacenter_id == datacenter_id)
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = list(
        db.scalars(
            query.order_by(Device.name).offset((page - 1) * page_size).limit(page_size)
        )
    )
    return DeviceListOut(items=items, total=total, page=page, page_size=page_size)


def _validate_rack_position(
    db: Session,
    org_id: int,
    rack_id: int,
    position_u: int,
    height_u: int,
    exclude_device_id: int | None = None,
) -> None:
    """Ensure the device fits in the rack and does not overlap an existing device.

    A device occupies position_u .. position_u + height_u - 1.
    """
    rack = rack_service.get_or_404(db, org_id, rack_id)
    top = position_u + height_u - 1
    if top > rack.u_height:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Device does not fit: occupies U{position_u}-U{top} "
            f"but rack '{rack.name}' is only {rack.u_height}U",
        )

    query = select(Device).where(
        Device.rack_id == rack_id,
        Device.organization_id == org_id,
        Device.position_u.is_not(None),
        # interval overlap: existing.start <= new.end AND existing.end >= new.start
        Device.position_u <= top,
        Device.position_u + Device.height_u - 1 >= position_u,
    )
    if exclude_device_id is not None:
        query = query.where(Device.id != exclude_device_id)
    conflict = db.scalar(query)
    if conflict:
        conflict_top = conflict.position_u + conflict.height_u - 1
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Position conflict: '{conflict.name}' already occupies "
            f"U{conflict.position_u}-U{conflict_top} in rack '{rack.name}'",
        )


def _check_unique_fields(
    db: Session,
    org_id: int,
    asset_tag: str | None,
    serial_number: str | None,
    exclude_device_id: int | None = None,
) -> None:
    conditions = []
    if asset_tag is not None:
        conditions.append(Device.asset_tag == asset_tag)
    if serial_number is not None:
        conditions.append(Device.serial_number == serial_number)
    if not conditions:
        return
    query = select(Device).where(Device.organization_id == org_id, or_(*conditions))
    if exclude_device_id is not None:
        query = query.where(Device.id != exclude_device_id)
    existing = db.scalar(query)
    if existing:
        field = "asset_tag" if existing.asset_tag == asset_tag else "serial_number"
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"A device with this {field} already exists in your organization",
        )


def _resolve_location(
    db: Session, org_id: int, rack_id: int | None, warehouse_id: int | None
) -> None:
    """A device lives in at most one place. Reject rack + warehouse together;
    validate the warehouse exists when set."""
    if rack_id is not None and warehouse_id is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "A device cannot be in a rack and a warehouse at the same time",
        )
    if warehouse_id is not None:
        from app.services import warehouse_service

        warehouse_service.get_warehouse_or_404(db, org_id, warehouse_id)


def create(db: Session, user: User, data: DeviceCreate) -> Device:
    org_id = user.organization_id
    _check_unique_fields(db, org_id, data.asset_tag, data.serial_number)
    _resolve_location(db, org_id, data.rack_id, data.warehouse_id)
    if data.rack_id is not None and data.position_u is not None:
        _validate_rack_position(
            db, org_id, data.rack_id, data.position_u, data.height_u
        )
    elif data.rack_id is not None:
        rack_service.get_or_404(db, org_id, data.rack_id)

    device = Device(**data.model_dump(), organization_id=org_id)
    db.add(device)
    db.flush()
    log_action(
        db,
        user=user,
        action="create",
        entity_type="device",
        entity_id=device.id,
        entity_name=device.name,
        new_values=entity_to_dict(device),
    )
    db.commit()
    db.refresh(device)
    return device


def update(db: Session, user: User, device_id: int, data: DeviceUpdate) -> Device:
    org_id = user.organization_id
    device = get_or_404(db, org_id, device_id)
    changes = data.model_dump(exclude_unset=True)

    _check_unique_fields(
        db,
        org_id,
        changes.get("asset_tag"),
        changes.get("serial_number"),
        exclude_device_id=device.id,
    )

    if "lifecycle_status" in changes and changes["lifecycle_status"] is not None:
        _validate_lifecycle_transition(
            device.lifecycle_status, changes["lifecycle_status"], user
        )

    # Location: moving into a warehouse clears any rack placement and vice-versa.
    if "warehouse_id" in changes and changes["warehouse_id"] is not None:
        _resolve_location(db, org_id, changes.get("rack_id"), changes["warehouse_id"])
        changes["rack_id"] = None
        changes["position_u"] = None
    elif changes.get("rack_id") is not None:
        changes["warehouse_id"] = None

    new_rack_id = changes.get("rack_id", device.rack_id)
    new_position = changes.get("position_u", device.position_u)
    new_height = changes.get("height_u", device.height_u)
    if new_rack_id is not None and new_position is not None:
        _validate_rack_position(
            db, org_id, new_rack_id, new_position, new_height,
            exclude_device_id=device.id,
        )
    elif new_rack_id is not None and "rack_id" in changes:
        rack_service.get_or_404(db, org_id, new_rack_id)

    old = entity_to_dict(device)
    for field, value in changes.items():
        setattr(device, field, value)
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
    return device


def delete(db: Session, user: User, device_id: int) -> None:
    device = get_or_404(db, user.organization_id, device_id)
    old = entity_to_dict(device)
    log_action(
        db,
        user=user,
        action="delete",
        entity_type="device",
        entity_id=device.id,
        entity_name=device.name,
        old_values=old,
    )
    db.delete(device)
    db.commit()
