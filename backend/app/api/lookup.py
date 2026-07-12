from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId
from app.models import Device

router = APIRouter(prefix="/api/lookup", tags=["lookup"])


class LookupResult(BaseModel):
    type: str  # "device" | "stock_item"
    id: int
    name: str
    identifier: str  # asset_tag or sku


@router.get("/{code}", response_model=LookupResult)
def lookup(code: str, db: Annotated[Session, Depends(get_db)], org_id: OrgId) -> LookupResult:
    """Resolve a scanned code (device asset_tag or stock item SKU) to its entity,
    so a single 'scan anything' flow can route to the right page.
    """
    value = code.strip()

    device = db.scalar(
        select(Device).where(
            Device.organization_id == org_id, Device.asset_tag == value
        )
    )
    if device:
        return LookupResult(
            type="device", id=device.id, name=device.name, identifier=device.asset_tag
        )

    # Stock item resolution (added in the warehouse stage) — imported lazily so
    # this module works before that model/table exists.
    try:
        from app.models import StockItem  # type: ignore

        item = db.scalar(
            select(StockItem).where(
                StockItem.organization_id == org_id, StockItem.sku == value
            )
        )
        if item:
            return LookupResult(
                type="stock_item", id=item.id, name=item.name, identifier=item.sku
            )
    except ImportError:
        pass

    raise HTTPException(status.HTTP_404_NOT_FOUND, f"No device or stock item matches '{value}'")
