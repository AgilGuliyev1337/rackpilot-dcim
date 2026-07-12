from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import User
from app.schemas.infra import FloorPlanOut, RoomCreate, RoomOut, RoomUpdate
from app.services import room_service

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("", response_model=list[RoomOut])
def list_rooms(
    db: DB, org_id: OrgId, datacenter_id: int | None = None
) -> list[RoomOut]:
    return room_service.list_all(db, org_id, datacenter_id)


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: DB, org_id: OrgId) -> RoomOut:
    return room_service.get_or_404(db, org_id, room_id)


@router.get("/{room_id}/floorplan", response_model=FloorPlanOut)
def get_room_floorplan(room_id: int, db: DB, org_id: OrgId) -> FloorPlanOut:
    return room_service.get_floorplan(db, org_id, room_id)


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(data: RoomCreate, db: DB, user: Engineer) -> RoomOut:
    return room_service.create(db, user, data)


@router.put("/{room_id}", response_model=RoomOut)
def update_room(room_id: int, data: RoomUpdate, db: DB, user: Engineer) -> RoomOut:
    return room_service.update(db, user, room_id, data)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: int, db: DB, user: Engineer) -> None:
    room_service.delete(db, user, room_id)
