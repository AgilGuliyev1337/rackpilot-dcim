from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    floor: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    # Floor-plan grid dimensions (units)
    floor_width: Mapped[int] = mapped_column(Integer, default=20)
    floor_height: Mapped[int] = mapped_column(Integer, default=15)
    datacenter_id: Mapped[int] = mapped_column(
        ForeignKey("datacenters.id", ondelete="CASCADE"), index=True
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )

    datacenter: Mapped["DataCenter"] = relationship(back_populates="rooms")  # noqa: F821
    racks: Mapped[list["Rack"]] = relationship(  # noqa: F821
        back_populates="room", cascade="all, delete-orphan"
    )
