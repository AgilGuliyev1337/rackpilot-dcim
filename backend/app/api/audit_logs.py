from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId
from app.models import AuditLog
from app.schemas.dashboard import AuditLogOut

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


class AuditLogListOut(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int


@router.get("", response_model=AuditLogListOut)
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    org_id: OrgId,
    action: str | None = None,
    entity_type: str | None = None,
    user_email: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 25,
) -> AuditLogListOut:
    base = select(AuditLog).where(AuditLog.organization_id == org_id)
    if action:
        base = base.where(AuditLog.action == action)
    if entity_type:
        base = base.where(AuditLog.entity_type == entity_type)
    if user_email:
        base = base.where(AuditLog.user_email.ilike(f"%{user_email}%"))
    if date_from:
        base = base.where(AuditLog.timestamp >= date_from)
    if date_to:
        base = base.where(AuditLog.timestamp <= date_to)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(
        db.scalars(
            base.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return AuditLogListOut(items=items, total=total, page=page, page_size=page_size)
