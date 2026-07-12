from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Device, Rack, Room, User
from app.schemas.infra import FloorPlanOut, FloorPlanRack, RoomCreate, RoomUpdate
from app.services import datacenter_service, power
from app.services.audit_service import entity_to_dict, log_action


def get_or_404(db: Session, org_id: int, room_id: int) -> Room:
    room = db.scalar(
        select(Room).where(Room.id == room_id, Room.organization_id == org_id)
    )
    if not room:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Room not found")
    return room


def list_all(db: Session, org_id: int, datacenter_id: int | None = None) -> list[Room]:
    query = select(Room).where(Room.organization_id == org_id).order_by(Room.name)
    if datacenter_id is not None:
        query = query.where(Room.datacenter_id == datacenter_id)
    return list(db.scalars(query))


def get_floorplan(db: Session, org_id: int, room_id: int) -> FloorPlanOut:
    room = get_or_404(db, org_id, room_id)
    racks = db.scalars(
        select(Rack).where(Rack.room_id == room.id).order_by(Rack.name)
    ).all()

    # occupied U + power per rack, in one query
    used_by_rack: dict[int, int] = {}
    counts_by_rack: dict[int, int] = {}
    power_by_rack: dict[int, int] = {}
    for device in db.scalars(
        select(Device).where(
            Device.organization_id == org_id,
            Device.rack_id.in_([r.id for r in racks]) if racks else False,
        )
    ):
        counts_by_rack[device.rack_id] = counts_by_rack.get(device.rack_id, 0) + 1
        power_by_rack[device.rack_id] = (
            power_by_rack.get(device.rack_id, 0) + (device.power_watts or 0)
        )
        if device.position_u is not None:
            used_by_rack[device.rack_id] = (
                used_by_rack.get(device.rack_id, 0) + device.height_u
            )

    plan_racks = [
        FloorPlanRack(
            id=r.id,
            name=r.name,
            u_height=r.u_height,
            pos_x=r.pos_x,
            pos_y=r.pos_y,
            width_units=r.width_units,
            depth_units=r.depth_units,
            device_count=counts_by_rack.get(r.id, 0),
            used_u=used_by_rack.get(r.id, 0),
            utilization_percent=round(used_by_rack.get(r.id, 0) / r.u_height * 100, 1),
            power_percent=power.power_percent(
                power_by_rack.get(r.id, 0), r.power_capacity_watts
            ),
            power_status=power.power_status(
                power_by_rack.get(r.id, 0), r.power_capacity_watts
            ),
        )
        for r in racks
    ]
    return FloorPlanOut(
        room_id=room.id,
        room_name=room.name,
        floor_width=room.floor_width,
        floor_height=room.floor_height,
        racks=plan_racks,
    )


def create(db: Session, user: User, data: RoomCreate) -> Room:
    datacenter_service.get_or_404(db, user.organization_id, data.datacenter_id)
    room = Room(**data.model_dump(), organization_id=user.organization_id)
    db.add(room)
    db.flush()
    log_action(
        db,
        user=user,
        action="create",
        entity_type="room",
        entity_id=room.id,
        entity_name=room.name,
        new_values=entity_to_dict(room),
    )
    db.commit()
    db.refresh(room)
    return room


def update(db: Session, user: User, room_id: int, data: RoomUpdate) -> Room:
    room = get_or_404(db, user.organization_id, room_id)
    changes = data.model_dump(exclude_unset=True)
    if "datacenter_id" in changes and changes["datacenter_id"] is not None:
        datacenter_service.get_or_404(db, user.organization_id, changes["datacenter_id"])
    old = entity_to_dict(room)
    for field, value in changes.items():
        setattr(room, field, value)
    db.flush()
    log_action(
        db,
        user=user,
        action="update",
        entity_type="room",
        entity_id=room.id,
        entity_name=room.name,
        old_values=old,
        new_values=entity_to_dict(room),
    )
    db.commit()
    db.refresh(room)
    return room


def delete(db: Session, user: User, room_id: int) -> None:
    room = get_or_404(db, user.organization_id, room_id)
    old = entity_to_dict(room)
    log_action(
        db,
        user=user,
        action="delete",
        entity_type="room",
        entity_id=room.id,
        entity_name=room.name,
        old_values=old,
    )
    db.delete(room)
    db.commit()
