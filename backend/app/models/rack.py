from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Rack(Base):
    __tablename__ = "racks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    u_height: Mapped[int] = mapped_column(Integer, default=42)
    description: Mapped[str | None] = mapped_column(Text)
    # Floor-plan placement (grid units within the room)
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)
    width_units: Mapped[float] = mapped_column(Float, default=1.0)
    depth_units: Mapped[float] = mapped_column(Float, default=1.0)
    power_capacity_watts: Mapped[int | None] = mapped_column(Integer, default=10000)
    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), index=True
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )

    room: Mapped["Room"] = relationship(back_populates="racks")  # noqa: F821
    devices: Mapped[list["Device"]] = relationship(back_populates="rack")  # noqa: F821
