from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import DeviceStatus, DeviceType, LifecycleStatus


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("organization_id", "asset_tag", name="uq_device_org_asset_tag"),
        UniqueConstraint(
            "organization_id", "serial_number", name="uq_device_org_serial_number"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    asset_tag: Mapped[str] = mapped_column(String(100))
    serial_number: Mapped[str] = mapped_column(String(100))
    vendor: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(255))
    device_type: Mapped[DeviceType] = mapped_column(Enum(DeviceType, name="device_type"))
    status: Mapped[DeviceStatus] = mapped_column(
        Enum(DeviceStatus, name="device_status"), default=DeviceStatus.active
    )
    lifecycle_status: Mapped[LifecycleStatus] = mapped_column(
        Enum(LifecycleStatus, name="lifecycle_status"),
        default=LifecycleStatus.production,
    )
    owner: Mapped[str | None] = mapped_column(String(255))
    department: Mapped[str | None] = mapped_column(String(255))
    support_contract: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    cpu: Mapped[str | None] = mapped_column(String(255))
    power_watts: Mapped[int | None] = mapped_column(Integer)
    ram: Mapped[str | None] = mapped_column(String(100))
    storage: Mapped[str | None] = mapped_column(String(255))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    mac_address: Mapped[str | None] = mapped_column(String(17))
    operating_system: Mapped[str | None] = mapped_column(String(255))
    rack_id: Mapped[int | None] = mapped_column(
        ForeignKey("racks.id", ondelete="SET NULL"), index=True
    )
    warehouse_id: Mapped[int | None] = mapped_column(
        ForeignKey("warehouses.id", ondelete="SET NULL"), index=True
    )
    position_u: Mapped[int | None] = mapped_column(Integer)
    height_u: Mapped[int] = mapped_column(Integer, default=1)
    warranty_expiry: Mapped[date | None] = mapped_column(Date)
    purchase_date: Mapped[date | None] = mapped_column(Date)
    photo_front_url: Mapped[str | None] = mapped_column(String(500))
    photo_back_url: Mapped[str | None] = mapped_column(String(500))
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    rack: Mapped["Rack | None"] = relationship(back_populates="devices")  # noqa: F821
