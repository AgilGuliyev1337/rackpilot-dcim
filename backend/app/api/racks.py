from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import User
from app.schemas.infra import RackCreate, RackLayout, RackOut, RackUpdate
from app.services import rack_service

router = APIRouter(prefix="/api/racks", tags=["racks"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("", response_model=list[RackOut])
def list_racks(db: DB, org_id: OrgId, room_id: int | None = None) -> list[RackOut]:
    return rack_service.list_all(db, org_id, room_id)


@router.get("/{rack_id}", response_model=RackOut)
def get_rack(rack_id: int, db: DB, org_id: OrgId) -> RackOut:
    return rack_service.get_or_404(db, org_id, rack_id)


@router.get("/{rack_id}/layout", response_model=RackLayout)
def get_rack_layout(rack_id: int, db: DB, org_id: OrgId) -> RackLayout:
    return rack_service.get_layout(db, org_id, rack_id)


@router.post("", response_model=RackOut, status_code=status.HTTP_201_CREATED)
def create_rack(data: RackCreate, db: DB, user: Engineer) -> RackOut:
    return rack_service.create(db, user, data)


@router.put("/{rack_id}", response_model=RackOut)
def update_rack(rack_id: int, data: RackUpdate, db: DB, user: Engineer) -> RackOut:
    return rack_service.update(db, user, rack_id, data)


@router.delete("/{rack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rack(rack_id: int, db: DB, user: Engineer) -> None:
    rack_service.delete(db, user, rack_id)
