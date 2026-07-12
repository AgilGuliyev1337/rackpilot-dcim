from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.database import Base
from app.models import AuditLog, User


def entity_to_dict(entity: Base) -> dict[str, Any]:
    """Serialize a model's column values into a JSON-safe dict."""
    result: dict[str, Any] = {}
    for column in entity.__table__.columns:
        value = getattr(entity, column.name)
        if isinstance(value, (datetime, date)):
            value = value.isoformat()
        elif value is not None and not isinstance(value, (str, int, float, bool, dict)):
            value = str(value)
        result[column.name] = value
    return result


def log_action(
    db: Session,
    *,
    user: User,
    action: str,
    entity_type: str,
    entity_id: int,
    entity_name: str,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> None:
    """Append an audit row. Caller is responsible for committing."""
    db.add(
        AuditLog(
            user_id=user.id,
            user_email=user.email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
            organization_id=user.organization_id,
        )
    )
