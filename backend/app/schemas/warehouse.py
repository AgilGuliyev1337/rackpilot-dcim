from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MovementType, StockCategory, StockUnit
from app.schemas.infra import DeviceOut


# --- Warehouse ---


class WarehouseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    description: str | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    description: str | None = None


class WarehouseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: str | None
    description: str | None
    organization_id: int


# --- StockItem ---


class StockItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=100)
    category: StockCategory = StockCategory.other
    quantity: int = Field(default=0, ge=0)
    min_threshold: int = Field(default=0, ge=0)
    unit: StockUnit = StockUnit.pcs
    warehouse_id: int
    vendor: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class StockItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    category: StockCategory | None = None
    min_threshold: int | None = Field(default=None, ge=0)
    unit: StockUnit | None = None
    warehouse_id: int | None = None
    vendor: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    # quantity is intentionally not editable here — use a stock movement


class StockItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    category: StockCategory
    quantity: int
    min_threshold: int
    unit: StockUnit
    warehouse_id: int
    vendor: str | None
    notes: str | None
    organization_id: int


# --- StockMovement ---


class StockMovementCreate(BaseModel):
    movement_type: MovementType
    quantity: int = Field(gt=0)
    note: str | None = None
    linked_device_id: int | None = None


class StockMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stock_item_id: int
    movement_type: MovementType
    quantity: int
    resulting_quantity: int
    performed_by_email: str
    note: str | None
    linked_device_id: int | None
    organization_id: int
    timestamp: datetime


class StockMovementList(BaseModel):
    items: list[StockMovementOut]
    total: int
    page: int
    page_size: int


class WarehouseDetail(BaseModel):
    warehouse: WarehouseOut
    stock_items: list[StockItemOut]
    devices: list[DeviceOut]


class LowStockItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    quantity: int
    min_threshold: int
    unit: StockUnit
    warehouse_id: int
