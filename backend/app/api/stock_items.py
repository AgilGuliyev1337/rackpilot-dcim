from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import OrgId, require_engineer
from app.models import User
from app.schemas.warehouse import (
    StockItemCreate,
    StockItemOut,
    StockItemUpdate,
    StockMovementCreate,
    StockMovementList,
)
from app.services import code_service, warehouse_service

router = APIRouter(prefix="/api/stock-items", tags=["stock-items"])

DB = Annotated[Session, Depends(get_db)]
Engineer = Annotated[User, Depends(require_engineer)]


@router.get("", response_model=list[StockItemOut])
def list_items(
    db: DB, org_id: OrgId, warehouse_id: int | None = None, search: str | None = None
) -> list[StockItemOut]:
    return warehouse_service.list_items(db, org_id, warehouse_id, search)


@router.get("/{item_id}", response_model=StockItemOut)
def get_item(item_id: int, db: DB, org_id: OrgId) -> StockItemOut:
    return warehouse_service.get_item_or_404(db, org_id, item_id)


@router.post("", response_model=StockItemOut, status_code=status.HTTP_201_CREATED)
def create_item(data: StockItemCreate, db: DB, user: Engineer) -> StockItemOut:
    return warehouse_service.create_item(db, user, data)


@router.put("/{item_id}", response_model=StockItemOut)
def update_item(
    item_id: int, data: StockItemUpdate, db: DB, user: Engineer
) -> StockItemOut:
    return warehouse_service.update_item(db, user, item_id, data)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: DB, user: Engineer) -> None:
    warehouse_service.delete_item(db, user, item_id)


@router.post("/{item_id}/movement", response_model=StockItemOut)
def record_movement(
    item_id: int, data: StockMovementCreate, db: DB, user: Engineer
) -> StockItemOut:
    return warehouse_service.record_movement(db, user, item_id, data)


@router.get("/{item_id}/movements", response_model=StockMovementList)
def list_movements(
    item_id: int,
    db: DB,
    org_id: OrgId,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 25,
) -> StockMovementList:
    return warehouse_service.list_movements(db, org_id, item_id, page, page_size)


@router.get("/{item_id}/qrcode")
def item_qrcode(item_id: int, db: DB, org_id: OrgId) -> Response:
    item = warehouse_service.get_item_or_404(db, org_id, item_id)
    url = f"{settings.frontend_base_url}/warehouses/stock/{item.id}"
    return Response(content=code_service.qr_png(url), media_type="image/png")


@router.get("/{item_id}/barcode")
def item_barcode(item_id: int, db: DB, org_id: OrgId) -> Response:
    item = warehouse_service.get_item_or_404(db, org_id, item_id)
    return Response(content=code_service.barcode_png(item.sku), media_type="image/png")
