from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DataCenter(Base):
    __tablename__ = "datacenters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )

    organization: Mapped["Organization"] = relationship(  # noqa: F821
        back_populates="datacenters"
    )
    rooms: Mapped[list["Room"]] = relationship(  # noqa: F821
        back_populates="datacenter", cascade="all, delete-orphan"
    )
