"""Idempotent seed script for the demo organization "Example Telecom".

Run with: python seed.py  (or inside the backend container).
Safe to re-run: existing rows are looked up by natural keys and reused.
"""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    AuditLog,
    DataCenter,
    Device,
    DeviceStatus,
    DeviceType,
    LifecycleStatus,
    Organization,
    Rack,
    Room,
    StockCategory,
    StockItem,
    StockUnit,
    User,
    UserRole,
    Warehouse,
)
from app.schemas.infra import DeviceUpdate
from app.services import device_service

DEMO_PASSWORD = "Demo123!"

TODAY = date.today()


def get_or_create(db: Session, model, defaults: dict | None = None, **lookup):
    instance = db.scalar(select(model).filter_by(**lookup))
    if instance:
        return instance
    instance = model(**lookup, **(defaults or {}))
    db.add(instance)
    db.flush()
    return instance


def seed_devices(db: Session, org: Organization, racks: dict[str, Rack]) -> int:
    def dev(
        name: str,
        n: int,
        device_type: DeviceType,
        vendor: str,
        model: str,
        rack: str,
        position_u: int,
        height_u: int = 1,
        status: DeviceStatus = DeviceStatus.active,
        warranty_days: int | None = None,
        **extra,
    ) -> dict:
        lifecycle = {
            DeviceStatus.decommissioned: LifecycleStatus.decommissioned,
            DeviceStatus.maintenance: LifecycleStatus.maintenance,
            DeviceStatus.inactive: LifecycleStatus.installed,
        }.get(status, LifecycleStatus.production)
        typical_watts = {
            DeviceType.server: 450,
            DeviceType.switch: 150,
            DeviceType.router: 250,
            DeviceType.firewall: 200,
            DeviceType.load_balancer: 300,
            DeviceType.san: 800,
            DeviceType.nas: 200,
            DeviceType.ups: 100,
            DeviceType.pdu: 20,
        }.get(device_type, 200)
        return {
            "name": name,
            "asset_tag": f"AZT-{n:04d}",
            "serial_number": f"{vendor[:3].upper()}{n:07d}",
            "vendor": vendor,
            "model": model,
            "device_type": device_type,
            "status": status,
            "lifecycle_status": lifecycle,
            "power_watts": typical_watts * height_u,
            "purchase_date": TODAY - timedelta(days=900 + (n % 500)),
            "rack": rack,
            "position_u": position_u,
            "height_u": height_u,
            "warranty_expiry": (
                TODAY + timedelta(days=warranty_days) if warranty_days else None
            ),
            **extra,
        }

    server_extra = {
        "cpu": "2x Intel Xeon Gold 6338",
        "ram": "256GB DDR4",
        "storage": "8x 1.92TB SSD",
        "operating_system": "Ubuntu Server 22.04 LTS",
        "owner": "Platform Team",
    }

    devices = [
        # --- Baku DC / RACK-01: compute ---
        dev("bk-esx-01", 1001, DeviceType.server, "Dell", "PowerEdge R750", "RACK-01", 1, 2,
            ip_address="10.10.1.11", warranty_days=45, **server_extra),
        dev("bk-esx-02", 1002, DeviceType.server, "Dell", "PowerEdge R750", "RACK-01", 3, 2,
            ip_address="10.10.1.12", warranty_days=45, **server_extra),
        dev("bk-esx-03", 1003, DeviceType.server, "Dell", "PowerEdge R650", "RACK-01", 5, 1,
            ip_address="10.10.1.13", warranty_days=400, **server_extra),
        dev("bk-esx-04", 1004, DeviceType.server, "HPE", "ProLiant DL380 Gen11", "RACK-01", 6, 2,
            ip_address="10.10.1.14", warranty_days=700, **server_extra),
        dev("bk-esx-05", 1005, DeviceType.server, "HPE", "ProLiant DL380 Gen11", "RACK-01", 8, 2,
            ip_address="10.10.1.15", status=DeviceStatus.maintenance, **server_extra),
        dev("bk-sw-top-01", 1006, DeviceType.switch, "Cisco", "Nexus 93180YC-FX", "RACK-01", 42, 1,
            ip_address="10.10.0.11", owner="Network Team"),
        # --- Baku DC / RACK-02: compute ---
        dev("bk-db-01", 1007, DeviceType.server, "Dell", "PowerEdge R750", "RACK-02", 1, 2,
            ip_address="10.10.1.21", warranty_days=30, cpu="2x AMD EPYC 7543",
            ram="512GB DDR4", storage="12x 3.84TB NVMe", operating_system="RHEL 9",
            owner="DBA Team"),
        dev("bk-db-02", 1008, DeviceType.server, "Dell", "PowerEdge R750", "RACK-02", 3, 2,
            ip_address="10.10.1.22", warranty_days=30, cpu="2x AMD EPYC 7543",
            ram="512GB DDR4", storage="12x 3.84TB NVMe", operating_system="RHEL 9",
            owner="DBA Team"),
        dev("bk-app-01", 1009, DeviceType.server, "Lenovo", "ThinkSystem SR650", "RACK-02", 5, 2,
            ip_address="10.10.1.23", warranty_days=365, **server_extra),
        dev("bk-app-02", 1010, DeviceType.server, "Lenovo", "ThinkSystem SR650", "RACK-02", 7, 2,
            ip_address="10.10.1.24", warranty_days=365, **server_extra),
        dev("bk-app-03", 1011, DeviceType.server, "Lenovo", "ThinkSystem SR650", "RACK-02", 9, 2,
            ip_address="10.10.1.25", status=DeviceStatus.inactive, **server_extra),
        dev("bk-sw-top-02", 1012, DeviceType.switch, "Cisco", "Nexus 93180YC-FX", "RACK-02", 42, 1,
            ip_address="10.10.0.12", owner="Network Team"),
        # --- Baku DC / RACK-03: network core ---
        dev("bk-core-sw-01", 1013, DeviceType.switch, "Cisco", "Catalyst 9500-48Y4C", "RACK-03", 40, 1,
            ip_address="10.10.0.1", warranty_days=60, owner="Network Team"),
        dev("bk-core-sw-02", 1014, DeviceType.switch, "Cisco", "Catalyst 9500-48Y4C", "RACK-03", 39, 1,
            ip_address="10.10.0.2", warranty_days=60, owner="Network Team"),
        dev("bk-edge-rtr-01", 1015, DeviceType.router, "Cisco", "ASR 1002-HX", "RACK-03", 37, 2,
            ip_address="10.10.0.3", owner="Network Team"),
        dev("bk-edge-rtr-02", 1016, DeviceType.router, "Cisco", "ASR 1002-HX", "RACK-03", 35, 2,
            ip_address="10.10.0.4", owner="Network Team"),
        dev("bk-fw-01", 1017, DeviceType.firewall, "Fortinet", "FortiGate 600F", "RACK-03", 33, 1,
            ip_address="10.10.0.5", warranty_days=75, owner="Security Team"),
        dev("bk-fw-02", 1018, DeviceType.firewall, "Fortinet", "FortiGate 600F", "RACK-03", 32, 1,
            ip_address="10.10.0.6", warranty_days=75, owner="Security Team"),
        dev("bk-lb-01", 1019, DeviceType.load_balancer, "F5", "BIG-IP i4800", "RACK-03", 30, 1,
            ip_address="10.10.0.7", owner="Network Team"),
        # --- Baku DC / RACK-04: storage + power ---
        dev("bk-san-01", 1020, DeviceType.san, "NetApp", "AFF A400", "RACK-04", 1, 4,
            ip_address="10.10.2.11", warranty_days=200, owner="Storage Team"),
        dev("bk-nas-01", 1021, DeviceType.nas, "Synology", "RS4021xs+", "RACK-04", 5, 2,
            ip_address="10.10.2.12", owner="Storage Team"),
        dev("bk-nas-02", 1022, DeviceType.nas, "Synology", "RS4021xs+", "RACK-04", 7, 2,
            ip_address="10.10.2.13", status=DeviceStatus.decommissioned, owner="Storage Team"),
        dev("bk-ups-01", 1023, DeviceType.ups, "APC", "Smart-UPS SRT 10kVA", "RACK-04", 38, 4,
            owner="Facilities"),
        dev("bk-pdu-01", 1024, DeviceType.pdu, "APC", "AP8886 Rack PDU", "RACK-04", 36, 1,
            owner="Facilities"),
        dev("bk-pdu-02", 1025, DeviceType.pdu, "APC", "AP8886 Rack PDU", "RACK-04", 35, 1,
            owner="Facilities"),
        # --- Ganja DC / RACK-05: compute ---
        dev("gj-esx-01", 2001, DeviceType.server, "Dell", "PowerEdge R650", "RACK-05", 1, 1,
            ip_address="10.20.1.11", warranty_days=500, **server_extra),
        dev("gj-esx-02", 2002, DeviceType.server, "Dell", "PowerEdge R650", "RACK-05", 2, 1,
            ip_address="10.20.1.12", warranty_days=500, **server_extra),
        dev("gj-esx-03", 2003, DeviceType.server, "HPE", "ProLiant DL380 Gen11", "RACK-05", 3, 2,
            ip_address="10.20.1.13", **server_extra),
        dev("gj-esx-04", 2004, DeviceType.server, "HPE", "ProLiant DL380 Gen11", "RACK-05", 5, 2,
            ip_address="10.20.1.14", status=DeviceStatus.maintenance, **server_extra),
        dev("gj-sw-top-05", 2005, DeviceType.switch, "Cisco", "Catalyst 9300-48T", "RACK-05", 42, 1,
            ip_address="10.20.0.11", owner="Network Team"),
        # --- Ganja DC / RACK-06: compute ---
        dev("gj-app-01", 2006, DeviceType.server, "Lenovo", "ThinkSystem SR650", "RACK-06", 1, 2,
            ip_address="10.20.1.21", warranty_days=85, **server_extra),
        dev("gj-app-02", 2007, DeviceType.server, "Lenovo", "ThinkSystem SR650", "RACK-06", 3, 2,
            ip_address="10.20.1.22", warranty_days=85, **server_extra),
        dev("gj-sw-top-06", 2008, DeviceType.switch, "Cisco", "Catalyst 9300-48T", "RACK-06", 42, 1,
            ip_address="10.20.0.12", owner="Network Team"),
        # --- Ganja DC / RACK-07: network ---
        dev("gj-core-sw-01", 2009, DeviceType.switch, "Cisco", "Catalyst 9500-24Y4C", "RACK-07", 40, 1,
            ip_address="10.20.0.1", owner="Network Team"),
        dev("gj-edge-rtr-01", 2010, DeviceType.router, "Cisco", "ASR 1001-HX", "RACK-07", 38, 2,
            ip_address="10.20.0.2", owner="Network Team"),
        dev("gj-fw-01", 2011, DeviceType.firewall, "Fortinet", "FortiGate 400F", "RACK-07", 36, 1,
            ip_address="10.20.0.3", warranty_days=20, owner="Security Team"),
        # --- Ganja DC / RACK-08: storage + power ---
        dev("gj-san-01", 2012, DeviceType.san, "NetApp", "AFF A250", "RACK-08", 1, 2,
            ip_address="10.20.2.11", owner="Storage Team"),
        dev("gj-nas-01", 2013, DeviceType.nas, "Synology", "RS2423RP+", "RACK-08", 3, 1,
            ip_address="10.20.2.12", owner="Storage Team"),
        dev("gj-ups-01", 2014, DeviceType.ups, "APC", "Smart-UPS SRT 5kVA", "RACK-08", 38, 3,
            owner="Facilities"),
        dev("gj-pdu-01", 2015, DeviceType.pdu, "APC", "AP8881 Rack PDU", "RACK-08", 36, 1,
            owner="Facilities"),
    ]

    # Fill RACK-01 densely so the demo has a "nearly full" rack (U10-U39),
    # leaving RACK-05/06/08 half-empty for contrast.
    for i in range(15):
        n = 1026 + i
        pos = 10 + i * 2
        devices.append(
            dev(
                f"bk-esx-{i + 6:02d}",
                n,
                DeviceType.server,
                "Dell" if i % 2 else "HPE",
                "PowerEdge R650" if i % 2 else "ProLiant DL360 Gen11",
                "RACK-01",
                pos,
                2,
                ip_address=f"10.10.3.{i + 1}",
                warranty_days=(80 if i in (2, 7) else 550 + i * 10),
                **server_extra,
            )
        )

    created = 0
    for spec in devices:
        rack = racks[spec.pop("rack")]
        existing = db.scalar(
            select(Device).where(
                Device.organization_id == org.id,
                Device.asset_tag == spec["asset_tag"],
            )
        )
        if existing:
            continue
        mac_seed = int(spec["asset_tag"].split("-")[1])
        db.add(
            Device(
                **spec,
                rack_id=rack.id,
                organization_id=org.id,
                mac_address=f"00:1B:44:{(mac_seed >> 8) & 0xFF:02X}:{mac_seed & 0xFF:02X}:A0",
            )
        )
        created += 1
    return created


def seed_warehouse(db: Session, org: Organization) -> int:
    wh = get_or_create(
        db, Warehouse, name="Baku Central Warehouse", organization_id=org.id,
        defaults={"location": "Baku, Azerbaijan",
                  "description": "Central spare parts and consumables store"},
    )
    items = [
        # name, sku, category, qty, threshold, unit, vendor
        ("SFP+ 10G SR transceiver", "SKU-SFP-10G-SR", StockCategory.transceiver, 40, 10, StockUnit.pcs, "Cisco"),
        ("QSFP28 100G transceiver", "SKU-QSFP28-100G", StockCategory.transceiver, 6, 8, StockUnit.pcs, "Cisco"),
        ("Cat6A patch cable 2m", "SKU-CAB-C6A-2M", StockCategory.cable, 220, 50, StockUnit.pcs, "Panduit"),
        ("Fiber LC-LC OM4 5m", "SKU-CAB-OM4-5M", StockCategory.cable, 30, 40, StockUnit.pcs, "Corning"),
        ("Dell R750 rail kit", "SKU-RAIL-R750", StockCategory.rail_kit, 15, 5, StockUnit.pcs, "Dell"),
        ("Cage nut + screw kit", "SKU-KIT-CAGENUT", StockCategory.screw_kit, 12, 20, StockUnit.box, "Generic"),
        ("Spare PSU 1100W", "SKU-PSU-1100W", StockCategory.spare_psu, 9, 4, StockUnit.pcs, "Dell"),
        ("Spare 1.92TB SSD", "SKU-SSD-1920G", StockCategory.spare_drive, 3, 6, StockUnit.pcs, "Samsung"),
    ]
    created = 0
    for name, sku, category, qty, threshold, unit, vendor in items:
        existing = db.scalar(
            select(StockItem).where(
                StockItem.organization_id == org.id, StockItem.sku == sku
            )
        )
        if existing:
            continue
        db.add(
            StockItem(
                name=name, sku=sku, category=category, quantity=qty,
                min_threshold=threshold, unit=unit, warehouse_id=wh.id,
                vendor=vendor, organization_id=org.id,
            )
        )
        created += 1
    return created


def generate_demo_activity(db: Session, org: Organization, admin: User) -> int:
    """Run a few real updates through the service layer so the audit log and
    dashboard activity feed are populated on first login. Idempotent: only runs
    when the org has no audit entries yet.
    """
    already = db.scalar(
        select(func.count()).select_from(
            select(AuditLog.id).where(AuditLog.organization_id == org.id).subquery()
        )
    )
    if already:
        return 0

    changes = [
        ("AZT-1005", DeviceUpdate(status=DeviceStatus.active,
                                  notes="Completed scheduled maintenance window")),
        ("AZT-1011", DeviceUpdate(status=DeviceStatus.active,
                                  notes="Returned to production after hardware swap")),
        ("AZT-1007", DeviceUpdate(owner="Database Platform Team",
                                  notes="Onboarded to central monitoring")),
    ]
    count = 0
    for asset_tag, update in changes:
        device = db.scalar(
            select(Device).where(
                Device.organization_id == org.id, Device.asset_tag == asset_tag
            )
        )
        if device:
            device_service.update(db, admin, device.id, update)
            count += 1
    return count


def main() -> None:
    db = SessionLocal()
    try:
        org = get_or_create(
            db, Organization, slug="example-telecom", defaults={"name": "Example Telecom"}
        )

        users = [
            ("admin@example.com", "Anar Aliyev", UserRole.admin),
            ("engineer@example.com", "Leyla Mammadova", UserRole.engineer),
            ("viewer@example.com", "Rashad Huseynov", UserRole.viewer),
        ]
        for email, full_name, role in users:
            get_or_create(
                db,
                User,
                email=email,
                defaults={
                    "hashed_password": hash_password(DEMO_PASSWORD),
                    "full_name": full_name,
                    "role": role,
                    "organization_id": org.id,
                },
            )

        baku = get_or_create(
            db, DataCenter, name="Baku DC", organization_id=org.id,
            defaults={"location": "Baku, Azerbaijan",
                      "description": "Primary datacenter"},
        )
        ganja = get_or_create(
            db, DataCenter, name="Ganja DC", organization_id=org.id,
            defaults={"location": "Ganja, Azerbaijan",
                      "description": "Regional datacenter"},
        )

        room_specs = [
            ("Server Hall A", "1", baku),
            ("Server Hall B", "2", baku),
            ("Server Hall A", "1", ganja),
            ("Network Room", "1", ganja),
        ]
        rooms = [
            get_or_create(
                db, Room, name=name, datacenter_id=dc.id, organization_id=org.id,
                defaults={"floor": floor},
            )
            for name, floor, dc in room_specs
        ]

        rack_rooms = [rooms[0], rooms[0], rooms[1], rooms[1],
                      rooms[2], rooms[2], rooms[3], rooms[3]]
        racks = {}
        per_room: dict[int, int] = {}
        for i, room in enumerate(rack_rooms):
            local = per_room.get(room.id, 0)
            per_room[room.id] = local + 1
            racks[f"RACK-{i + 1:02d}"] = get_or_create(
                db, Rack, name=f"RACK-{i + 1:02d}", room_id=room.id,
                organization_id=org.id,
                defaults={
                    "u_height": 42,
                    # spread racks across the room grid for the floor plan
                    "pos_x": float(2 + local * 4),
                    "pos_y": 3.0,
                    "width_units": 2.0,
                    "depth_units": 2.0,
                    "power_capacity_watts": 20000,
                },
            )

        created = seed_devices(db, org, racks)
        stock_created = seed_warehouse(db, org)
        db.commit()

        admin = db.scalar(
            select(User).where(
                User.organization_id == org.id, User.role == UserRole.admin
            )
        )
        activity = generate_demo_activity(db, org, admin) if admin else 0

        total = len(
            db.scalars(select(Device).where(Device.organization_id == org.id)).all()
        )
        print(f"Seed complete: org '{org.name}', {created} devices created, {total} total.")
        print(f"Warehouse stock items created: {stock_created}.")
        print(f"Demo activity generated: {activity} audit entries.")
        print("Demo users: admin@example.com / engineer@example.com / viewer@example.com")
        print(f"Password: {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
