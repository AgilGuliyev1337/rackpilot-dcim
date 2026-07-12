from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, Device, DeviceType, Rack
from app.schemas.dashboard import DashboardOut, DeviceGroupCounts

DEVICE_GROUPS: dict[str, tuple[DeviceType, ...]] = {
    "servers": (DeviceType.server,),
    "network": (DeviceType.switch, DeviceType.router, DeviceType.firewall,
                DeviceType.load_balancer),
    "storage": (DeviceType.san, DeviceType.nas),
    "power": (DeviceType.ups, DeviceType.pdu),
}

WARRANTY_WINDOW_DAYS = 90
RECENT_AUDIT_LIMIT = 10


def get_dashboard(db: Session, org_id: int) -> DashboardOut:
    type_counts = dict(
        db.execute(
            select(Device.device_type, func.count())
            .where(Device.organization_id == org_id)
            .group_by(Device.device_type)
        ).all()
    )
    total_devices = sum(type_counts.values())
    groups = DeviceGroupCounts(
        **{
            group: sum(type_counts.get(t, 0) for t in types)
            for group, types in DEVICE_GROUPS.items()
        }
    )

    total_u = db.scalar(
        select(func.coalesce(func.sum(Rack.u_height), 0)).where(
            Rack.organization_id == org_id
        )
    )
    occupied_u = db.scalar(
        select(func.coalesce(func.sum(Device.height_u), 0)).where(
            Device.organization_id == org_id,
            Device.rack_id.is_not(None),
            Device.position_u.is_not(None),
        )
    )
    utilization = round(occupied_u / total_u * 100, 1) if total_u else 0.0

    total_power = db.scalar(
        select(func.coalesce(func.sum(Device.power_watts), 0)).where(
            Device.organization_id == org_id
        )
    )
    total_power_capacity = db.scalar(
        select(func.coalesce(func.sum(Rack.power_capacity_watts), 0)).where(
            Rack.organization_id == org_id
        )
    )

    today = date.today()
    expiring = list(
        db.scalars(
            select(Device)
            .where(
                Device.organization_id == org_id,
                Device.warranty_expiry.is_not(None),
                Device.warranty_expiry >= today,
                Device.warranty_expiry <= today + timedelta(days=WARRANTY_WINDOW_DAYS),
            )
            .order_by(Device.warranty_expiry)
        )
    )

    recent_logs = list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.organization_id == org_id)
            .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
            .limit(RECENT_AUDIT_LIMIT)
        )
    )

    from app.services import warehouse_service

    low_stock = warehouse_service.low_stock_items(db, org_id)

    return DashboardOut(
        total_devices=total_devices,
        devices_by_group=groups,
        rack_utilization_percent=utilization,
        total_power_watts=int(total_power),
        total_power_capacity_watts=int(total_power_capacity),
        warranty_expiring_soon=expiring,
        low_stock=low_stock,
        recent_audit_logs=recent_logs,
    )
