from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DataCenter, User
from app.schemas.infra import DataCenterCreate, DataCenterUpdate
from app.services.audit_service import entity_to_dict, log_action


def get_or_404(db: Session, org_id: int, datacenter_id: int) -> DataCenter:
    dc = db.scalar(
        select(DataCenter).where(
            DataCenter.id == datacenter_id, DataCenter.organization_id == org_id
        )
    )
    if not dc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Datacenter not found")
    return dc


def list_all(db: Session, org_id: int) -> list[DataCenter]:
    return list(
        db.scalars(
            select(DataCenter)
            .where(DataCenter.organization_id == org_id)
            .order_by(DataCenter.name)
        )
    )


def create(db: Session, user: User, data: DataCenterCreate) -> DataCenter:
    dc = DataCenter(**data.model_dump(), organization_id=user.organization_id)
    db.add(dc)
    db.flush()
    log_action(
        db,
        user=user,
        action="create",
        entity_type="datacenter",
        entity_id=dc.id,
        entity_name=dc.name,
        new_values=entity_to_dict(dc),
    )
    db.commit()
    db.refresh(dc)
    return dc


def update(db: Session, user: User, datacenter_id: int, data: DataCenterUpdate) -> DataCenter:
    dc = get_or_404(db, user.organization_id, datacenter_id)
    old = entity_to_dict(dc)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(dc, field, value)
    db.flush()
    log_action(
        db,
        user=user,
        action="update",
        entity_type="datacenter",
        entity_id=dc.id,
        entity_name=dc.name,
        old_values=old,
        new_values=entity_to_dict(dc),
    )
    db.commit()
    db.refresh(dc)
    return dc


def delete(db: Session, user: User, datacenter_id: int) -> None:
    dc = get_or_404(db, user.organization_id, datacenter_id)
    old = entity_to_dict(dc)
    log_action(
        db,
        user=user,
        action="delete",
        entity_type="datacenter",
        entity_id=dc.id,
        entity_name=dc.name,
        old_values=old,
    )
    db.delete(dc)
    db.commit()
