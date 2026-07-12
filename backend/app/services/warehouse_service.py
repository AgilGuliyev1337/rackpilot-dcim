from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Device,
    MovementType,
    StockItem,
    StockMovement,
    User,
    Warehouse,
)
from app.models.enums import MOVEMENT_INCREASES
from app.schemas.warehouse import (
    StockItemCreate,
    StockItemUpdate,
    StockMovementCreate,
    StockMovementList,
    WarehouseCreate,
    WarehouseDetail,
    WarehouseOut,
    WarehouseUpdate,
)
from app.services.audit_service import entity_to_dict, log_action


# --- Warehouse ---


def get_warehouse_or_404(db: Session, org_id: int, warehouse_id: int) -> Warehouse:
    wh = db.scalar(
        select(Warehouse).where(
            Warehouse.id == warehouse_id, Warehouse.organization_id == org_id
        )
    )
    if not wh:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Warehouse not found")
    return wh


def list_warehouses(db: Session, org_id: int) -> list[Warehouse]:
    return list(
        db.scalars(
            select(Warehouse)
            .where(Warehouse.organization_id == org_id)
            .order_by(Warehouse.name)
        )
    )


def create_warehouse(db: Session, user: User, data: WarehouseCreate) -> Warehouse:
    wh = Warehouse(**data.model_dump(), organization_id=user.organization_id)
    db.add(wh)
    db.flush()
    log_action(
        db, user=user, action="create", entity_type="warehouse",
        entity_id=wh.id, entity_name=wh.name, new_values=entity_to_dict(wh),
    )
    db.commit()
    db.refresh(wh)
    return wh


def update_warehouse(
    db: Session, user: User, warehouse_id: int, data: WarehouseUpdate
) -> Warehouse:
    wh = get_warehouse_or_404(db, user.organization_id, warehouse_id)
    old = entity_to_dict(wh)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(wh, field, value)
    db.flush()
    log_action(
        db, user=user, action="update", entity_type="warehouse",
        entity_id=wh.id, entity_name=wh.name,
        old_values=old, new_values=entity_to_dict(wh),
    )
    db.commit()
    db.refresh(wh)
    return wh


def delete_warehouse(db: Session, user: User, warehouse_id: int) -> None:
    wh = get_warehouse_or_404(db, user.organization_id, warehouse_id)
    log_action(
        db, user=user, action="delete", entity_type="warehouse",
        entity_id=wh.id, entity_name=wh.name, old_values=entity_to_dict(wh),
    )
    db.delete(wh)
    db.commit()


def get_warehouse_detail(db: Session, org_id: int, warehouse_id: int) -> WarehouseDetail:
    wh = get_warehouse_or_404(db, org_id, warehouse_id)
    items = list(
        db.scalars(
            select(StockItem)
            .where(StockItem.warehouse_id == wh.id, StockItem.organization_id == org_id)
            .order_by(StockItem.name)
        )
    )
    devices = list(
        db.scalars(
            select(Device)
            .where(Device.warehouse_id == wh.id, Device.organization_id == org_id)
            .order_by(Device.name)
        )
    )
    return WarehouseDetail(warehouse=WarehouseOut.model_validate(wh),
                           stock_items=items, devices=devices)


# --- StockItem ---


def get_item_or_404(db: Session, org_id: int, item_id: int) -> StockItem:
    item = db.scalar(
        select(StockItem).where(
            StockItem.id == item_id, StockItem.organization_id == org_id
        )
    )
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stock item not found")
    return item


def _check_sku_unique(
    db: Session, org_id: int, sku: str | None, exclude_id: int | None = None
) -> None:
    if not sku:
        return
    query = select(StockItem).where(
        StockItem.organization_id == org_id, StockItem.sku == sku
    )
    if exclude_id is not None:
        query = query.where(StockItem.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"A stock item with SKU '{sku}' already exists"
        )


def list_items(
    db: Session,
    org_id: int,
    warehouse_id: int | None = None,
    search: str | None = None,
) -> list[StockItem]:
    query = select(StockItem).where(StockItem.organization_id == org_id)
    if warehouse_id is not None:
        query = query.where(StockItem.warehouse_id == warehouse_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(StockItem.name.ilike(pattern), StockItem.sku.ilike(pattern))
        )
    return list(db.scalars(query.order_by(StockItem.name)))


def create_item(db: Session, user: User, data: StockItemCreate) -> StockItem:
    get_warehouse_or_404(db, user.organization_id, data.warehouse_id)
    _check_sku_unique(db, user.organization_id, data.sku)
    item = StockItem(**data.model_dump(), organization_id=user.organization_id)
    db.add(item)
    db.flush()
    log_action(
        db, user=user, action="create", entity_type="stock_item",
        entity_id=item.id, entity_name=item.name, new_values=entity_to_dict(item),
    )
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, user: User, item_id: int, data: StockItemUpdate) -> StockItem:
    item = get_item_or_404(db, user.organization_id, item_id)
    changes = data.model_dump(exclude_unset=True)
    _check_sku_unique(db, user.organization_id, changes.get("sku"), exclude_id=item.id)
    if changes.get("warehouse_id") is not None:
        get_warehouse_or_404(db, user.organization_id, changes["warehouse_id"])
    old = entity_to_dict(item)
    for field, value in changes.items():
        setattr(item, field, value)
    db.flush()
    log_action(
        db, user=user, action="update", entity_type="stock_item",
        entity_id=item.id, entity_name=item.name,
        old_values=old, new_values=entity_to_dict(item),
    )
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, user: User, item_id: int) -> None:
    item = get_item_or_404(db, user.organization_id, item_id)
    log_action(
        db, user=user, action="delete", entity_type="stock_item",
        entity_id=item.id, entity_name=item.name, old_values=entity_to_dict(item),
    )
    db.delete(item)
    db.commit()


# --- Movements ---


def record_movement(
    db: Session, user: User, item_id: int, data: StockMovementCreate
) -> StockItem:
    item = get_item_or_404(db, user.organization_id, item_id)
    if data.linked_device_id is not None:
        linked = db.scalar(
            select(Device).where(
                Device.id == data.linked_device_id,
                Device.organization_id == user.organization_id,
            )
        )
        if not linked:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Linked device not found")

    if data.movement_type in MOVEMENT_INCREASES:
        delta = data.quantity
    elif data.movement_type == MovementType.issued:
        delta = -data.quantity
    else:  # adjusted: set the quantity to the given value
        delta = data.quantity - item.quantity

    new_qty = item.quantity + delta
    if new_qty < 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot issue {data.quantity} {item.unit.value}; only {item.quantity} in stock",
        )

    old = entity_to_dict(item)
    item.quantity = new_qty
    db.add(
        StockMovement(
            stock_item_id=item.id,
            movement_type=data.movement_type,
            quantity=data.quantity,
            resulting_quantity=new_qty,
            performed_by_id=user.id,
            performed_by_email=user.email,
            note=data.note,
            linked_device_id=data.linked_device_id,
            organization_id=user.organization_id,
        )
    )
    db.flush()
    log_action(
        db, user=user, action="update", entity_type="stock_item",
        entity_id=item.id, entity_name=item.name,
        old_values=old, new_values=entity_to_dict(item),
    )
    db.commit()
    db.refresh(item)
    return item


def list_movements(
    db: Session, org_id: int, item_id: int, page: int = 1, page_size: int = 25
) -> StockMovementList:
    get_item_or_404(db, org_id, item_id)
    base = select(StockMovement).where(
        StockMovement.stock_item_id == item_id,
        StockMovement.organization_id == org_id,
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(
        db.scalars(
            base.order_by(StockMovement.timestamp.desc(), StockMovement.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return StockMovementList(items=items, total=total, page=page, page_size=page_size)


def low_stock_items(db: Session, org_id: int) -> list[StockItem]:
    return list(
        db.scalars(
            select(StockItem)
            .where(
                StockItem.organization_id == org_id,
                StockItem.quantity <= StockItem.min_threshold,
            )
            .order_by((StockItem.min_threshold - StockItem.quantity).desc())
        )
    )
