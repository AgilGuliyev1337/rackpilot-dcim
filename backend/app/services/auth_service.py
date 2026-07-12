import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.ratelimit import check_rate_limit, record_failure, reset
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    password_problems,
    verify_password,
)
from app.models import Organization, User, UserRole
from app.schemas.auth import RegisterRequest, TokenResponse


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "org"


def register(db: Session, data: RegisterRequest) -> User:
    """Create a new Organization together with its first admin user."""
    problem = password_problems(data.password)
    if problem:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    existing = db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    slug = base_slug = _slugify(data.organization_name)
    suffix = 1
    while db.scalar(select(Organization).where(Organization.slug == slug)):
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    org = Organization(name=data.organization_name, slug=slug)
    db.add(org)
    db.flush()

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.admin,
        organization_id=org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


def login(db: Session, email: str, password: str, client_ip: str = "?") -> TokenResponse:
    rate_key = f"{client_ip}:{email.lower()}"
    check_rate_limit(rate_key)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.hashed_password):
        record_failure(rate_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User account is disabled")
    reset(rate_key)
    return _issue_tokens(user)


def refresh(db: Session, user: User) -> TokenResponse:
    return _issue_tokens(user)


def logout(db: Session, user: User) -> None:
    """Revoke all outstanding tokens for this user by bumping the token version."""
    user.token_version += 1
    db.commit()
