from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import User
from app.schemas.infra import DataCenterCreate, DataCenterOut, DataCenterUpdate
from app.services import datacenter_service

router = APIRouter(prefix="/api/datacenters", tags=["datacenters"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("", response_model=list[DataCenterOut])
def list_datacenters(db: DB, org_id: OrgId) -> list[DataCenterOut]:
    return datacenter_service.list_all(db, org_id)


@router.get("/{datacenter_id}", response_model=DataCenterOut)
def get_datacenter(datacenter_id: int, db: DB, org_id: OrgId) -> DataCenterOut:
    return datacenter_service.get_or_404(db, org_id, datacenter_id)


@router.post("", response_model=DataCenterOut, status_code=status.HTTP_201_CREATED)
def create_datacenter(data: DataCenterCreate, db: DB, user: Engineer) -> DataCenterOut:
    return datacenter_service.create(db, user, data)


@router.put("/{datacenter_id}", response_model=DataCenterOut)
def update_datacenter(
    datacenter_id: int, data: DataCenterUpdate, db: DB, user: Engineer
) -> DataCenterOut:
    return datacenter_service.update(db, user, datacenter_id, data)


@router.delete("/{datacenter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_datacenter(datacenter_id: int, db: DB, user: Engineer) -> None:
    datacenter_service.delete(db, user, datacenter_id)
