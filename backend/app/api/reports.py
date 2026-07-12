from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId
from app.models import DataCenter, Device, Rack, Room, StockItem, Warehouse
from app.models.enums import LifecycleStatus
from app.services import power

router = APIRouter(prefix="/api/reports", tags=["reports"])


class InventoryRow(BaseModel):
    device_type: str
    vendor: str
    count: int


class WarrantyRow(BaseModel):
    id: int
    name: str
    asset_tag: str
    vendor: str | None
    model: str | None
    device_type: str
    warranty_expiry: date


class RackCapacityRow(BaseModel):
    rack_id: int
    rack_name: str
    datacenter: str
    room: str
    total_u: int
    used_u: int
    free_u: int
    utilization_percent: float
    power_capacity_watts: int | None
    power_consumption_watts: int
    power_percent: float
    power_status: str


class DatacenterCapacityRow(BaseModel):
    datacenter: str
    total_u: int
    used_u: int
    free_u: int
    utilization_percent: float
    power_capacity_watts: int
    power_consumption_watts: int
    power_percent: float


class LifecycleCount(BaseModel):
    lifecycle_status: str
    count: int


class StockLevelRow(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    warehouse: str
    quantity: int
    min_threshold: int
    unit: str
    low: bool


class ReportsOut(BaseModel):
    inventory: list[InventoryRow]
    warranty: list[WarrantyRow]
    rack_capacity: list[RackCapacityRow]
    datacenter_capacity: list[DatacenterCapacityRow]
    lifecycle: list[LifecycleCount]
    stock_levels: list[StockLevelRow]


@router.get("", response_model=ReportsOut)
def get_reports(db: Annotated[Session, Depends(get_db)], org_id: OrgId) -> ReportsOut:
    inventory = [
        InventoryRow(device_type=t.value, vendor=v or "(unknown)", count=c)
        for t, v, c in db.execute(
            select(Device.device_type, Device.vendor, func.count())
            .where(Device.organization_id == org_id)
            .group_by(Device.device_type, Device.vendor)
            .order_by(func.count().desc())
        )
    ]

    warranty = [
        WarrantyRow(
            id=d.id,
            name=d.name,
            asset_tag=d.asset_tag,
            vendor=d.vendor,
            model=d.model,
            device_type=d.device_type.value,
            warranty_expiry=d.warranty_expiry,
        )
        for d in db.scalars(
            select(Device)
            .where(
                Device.organization_id == org_id,
                Device.warranty_expiry.is_not(None),
            )
            .order_by(Device.warranty_expiry)
        )
    ]

    used_by_rack = dict(
        db.execute(
            select(Device.rack_id, func.coalesce(func.sum(Device.height_u), 0))
            .where(
                Device.organization_id == org_id,
                Device.rack_id.is_not(None),
                Device.position_u.is_not(None),
            )
            .group_by(Device.rack_id)
        ).all()
    )
    power_by_rack = dict(
        db.execute(
            select(Device.rack_id, func.coalesce(func.sum(Device.power_watts), 0))
            .where(Device.organization_id == org_id, Device.rack_id.is_not(None))
            .group_by(Device.rack_id)
        ).all()
    )

    rack_rows: list[RackCapacityRow] = []
    dc_totals: dict[str, dict[str, int]] = {}
    for rack, room, dc in db.execute(
        select(Rack, Room, DataCenter)
        .join(Room, Rack.room_id == Room.id)
        .join(DataCenter, Room.datacenter_id == DataCenter.id)
        .where(Rack.organization_id == org_id)
        .order_by(DataCenter.name, Rack.name)
    ):
        used = int(used_by_rack.get(rack.id, 0))
        rack_power = int(power_by_rack.get(rack.id, 0))
        rack_rows.append(
            RackCapacityRow(
                rack_id=rack.id,
                rack_name=rack.name,
                datacenter=dc.name,
                room=room.name,
                total_u=rack.u_height,
                used_u=used,
                free_u=rack.u_height - used,
                utilization_percent=round(used / rack.u_height * 100, 1),
                power_capacity_watts=rack.power_capacity_watts,
                power_consumption_watts=rack_power,
                power_percent=power.power_percent(rack_power, rack.power_capacity_watts),
                power_status=power.power_status(rack_power, rack.power_capacity_watts),
            )
        )
        totals = dc_totals.setdefault(
            dc.name, {"total": 0, "used": 0, "pcap": 0, "pcons": 0}
        )
        totals["total"] += rack.u_height
        totals["used"] += used
        totals["pcap"] += rack.power_capacity_watts or 0
        totals["pcons"] += rack_power

    dc_rows = [
        DatacenterCapacityRow(
            datacenter=name,
            total_u=t["total"],
            used_u=t["used"],
            free_u=t["total"] - t["used"],
            utilization_percent=round(t["used"] / t["total"] * 100, 1) if t["total"] else 0.0,
            power_capacity_watts=t["pcap"],
            power_consumption_watts=t["pcons"],
            power_percent=power.power_percent(t["pcons"], t["pcap"]),
        )
        for name, t in sorted(dc_totals.items())
    ]

    lifecycle_counts = dict(
        db.execute(
            select(Device.lifecycle_status, func.count())
            .where(Device.organization_id == org_id)
            .group_by(Device.lifecycle_status)
        ).all()
    )
    lifecycle = [
        LifecycleCount(lifecycle_status=stage.value, count=lifecycle_counts.get(stage, 0))
        for stage in LifecycleStatus
    ]

    stock_levels = [
        StockLevelRow(
            id=item.id,
            name=item.name,
            sku=item.sku,
            category=item.category.value,
            warehouse=wh_name,
            quantity=item.quantity,
            min_threshold=item.min_threshold,
            unit=item.unit.value,
            low=item.quantity <= item.min_threshold,
        )
        for item, wh_name in db.execute(
            select(StockItem, Warehouse.name)
            .join(Warehouse, StockItem.warehouse_id == Warehouse.id)
            .where(StockItem.organization_id == org_id)
            .order_by(Warehouse.name, StockItem.name)
        )
    ]

    return ReportsOut(
        inventory=inventory,
        warranty=warranty,
        rack_capacity=rack_rows,
        datacenter_capacity=dc_rows,
        lifecycle=lifecycle,
        stock_levels=stock_levels,
    )
