from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Device, Rack, User
from app.schemas.infra import RackCreate, RackLayout, RackUnit, RackUpdate
from app.services import power, room_service
from app.services.audit_service import entity_to_dict, log_action


def get_or_404(db: Session, org_id: int, rack_id: int) -> Rack:
    rack = db.scalar(
        select(Rack).where(Rack.id == rack_id, Rack.organization_id == org_id)
    )
    if not rack:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rack not found")
    return rack


def list_all(db: Session, org_id: int, room_id: int | None = None) -> list[Rack]:
    query = select(Rack).where(Rack.organization_id == org_id).order_by(Rack.name)
    if room_id is not None:
        query = query.where(Rack.room_id == room_id)
    return list(db.scalars(query))


def get_layout(db: Session, org_id: int, rack_id: int) -> RackLayout:
    rack = get_or_404(db, org_id, rack_id)
    devices = db.scalars(
        select(Device).where(
            Device.rack_id == rack.id,
            Device.organization_id == org_id,
            Device.position_u.is_not(None),
        )
    )
    device_list = list(devices)
    occupancy: dict[int, Device] = {}
    for device in device_list:
        for u in range(device.position_u, device.position_u + device.height_u):
            occupancy[u] = device

    units = []
    for u in range(rack.u_height, 0, -1):
        device = occupancy.get(u)
        units.append(
            RackUnit(
                u=u,
                occupied=device is not None,
                device_id=device.id if device else None,
                device_name=device.name if device else None,
                device_type=device.device_type if device else None,
                device_photo_url=device.photo_front_url if device else None,
            )
        )

    consumption = sum(d.power_watts or 0 for d in device_list)
    capacity = rack.power_capacity_watts
    return RackLayout(
        rack_id=rack.id,
        rack_name=rack.name,
        u_height=rack.u_height,
        units=units,
        power_capacity_watts=capacity,
        power_consumption_watts=consumption,
        power_available_watts=(capacity - consumption) if capacity is not None else None,
        power_percent=power.power_percent(consumption, capacity),
        power_status=power.power_status(consumption, capacity),
    )


def create(db: Session, user: User, data: RackCreate) -> Rack:
    room_service.get_or_404(db, user.organization_id, data.room_id)
    rack = Rack(**data.model_dump(), organization_id=user.organization_id)
    db.add(rack)
    db.flush()
    log_action(
        db,
        user=user,
        action="create",
        entity_type="rack",
        entity_id=rack.id,
        entity_name=rack.name,
        new_values=entity_to_dict(rack),
    )
    db.commit()
    db.refresh(rack)
    return rack


def update(db: Session, user: User, rack_id: int, data: RackUpdate) -> Rack:
    rack = get_or_404(db, user.organization_id, rack_id)
    changes = data.model_dump(exclude_unset=True)
    if "room_id" in changes and changes["room_id"] is not None:
        room_service.get_or_404(db, user.organization_id, changes["room_id"])
    old = entity_to_dict(rack)
    for field, value in changes.items():
        setattr(rack, field, value)
    db.flush()
    log_action(
        db,
        user=user,
        action="update",
        entity_type="rack",
        entity_id=rack.id,
        entity_name=rack.name,
        old_values=old,
        new_values=entity_to_dict(rack),
    )
    db.commit()
    db.refresh(rack)
    return rack


def delete(db: Session, user: User, rack_id: int) -> None:
    rack = get_or_404(db, user.organization_id, rack_id)
    old = entity_to_dict(rack)
    log_action(
        db,
        user=user,
        action="delete",
        entity_type="rack",
        entity_id=rack.id,
        entity_name=rack.name,
        old_values=old,
    )
    db.delete(rack)
    db.commit()
