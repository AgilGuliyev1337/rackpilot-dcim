from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import DeviceType


class DeviceGroupCounts(BaseModel):
    servers: int
    network: int
    storage: int
    power: int


class WarrantyExpiringDevice(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    asset_tag: str
    vendor: str | None
    model: str | None
    device_type: DeviceType
    warranty_expiry: date


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_email: str
    action: str
    entity_type: str
    entity_id: int
    entity_name: str
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    timestamp: datetime


class LowStockAlert(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    quantity: int
    min_threshold: int
    warehouse_id: int


class DashboardOut(BaseModel):
    total_devices: int
    devices_by_group: DeviceGroupCounts
    rack_utilization_percent: float
    total_power_watts: int
    total_power_capacity_watts: int
    warranty_expiring_soon: list[WarrantyExpiringDevice]
    low_stock: list[LowStockAlert]
    recent_audit_logs: list[AuditLogOut]
