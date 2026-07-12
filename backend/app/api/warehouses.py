from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import User
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseDetail,
    WarehouseOut,
    WarehouseUpdate,
)
from app.services import warehouse_service

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("", response_model=list[WarehouseOut])
def list_warehouses(db: DB, org_id: OrgId) -> list[WarehouseOut]:
    return warehouse_service.list_warehouses(db, org_id)


@router.get("/{warehouse_id}", response_model=WarehouseDetail)
def get_warehouse(warehouse_id: int, db: DB, org_id: OrgId) -> WarehouseDetail:
    return warehouse_service.get_warehouse_detail(db, org_id, warehouse_id)


@router.post("", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
def create_warehouse(data: WarehouseCreate, db: DB, user: Engineer) -> WarehouseOut:
    return warehouse_service.create_warehouse(db, user, data)


@router.put("/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(
    warehouse_id: int, data: WarehouseUpdate, db: DB, user: Engineer
) -> WarehouseOut:
    return warehouse_service.update_warehouse(db, user, warehouse_id, data)


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(warehouse_id: int, db: DB, user: Engineer) -> None:
    warehouse_service.delete_warehouse(db, user, warehouse_id)
