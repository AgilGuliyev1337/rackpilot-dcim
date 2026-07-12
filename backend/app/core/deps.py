from typing import Annotated

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def _get_user_from_token(db: Session, token: str, token_type: str) -> User:
    try:
        payload = decode_token(token, token_type)  # type: ignore[arg-type]
    except pyjwt.InvalidTokenError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    # Token version must match — logout / password change bumps it, invalidating
    # every token issued before that point (server-side revocation).
    if payload.get("ver", 0) != user.token_version:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _get_user_from_token(db, credentials.credentials, "access")


def get_refresh_user(
    refresh_token: str,
    db: Session,
) -> User:
    return _get_user_from_token(db, refresh_token, "refresh")


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_org_id(current_user: CurrentUser) -> int:
    """Single source of truth for tenant scoping — every router depends on this."""
    return current_user.organization_id


OrgId = Annotated[int, Depends(get_current_org_id)]


def require_admin(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return current_user


def require_engineer(current_user: CurrentUser) -> User:
    if current_user.role not in (UserRole.admin, UserRole.engineer):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Engineer or admin role required")
    return current_user
