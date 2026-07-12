from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_user, get_refresh_user
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Annotated[Session, Depends(get_db)]) -> UserOut:
    return auth_service.register(db, data)


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest, request: Request, db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    client_ip = request.client.host if request.client else "?"
    return auth_service.login(db, data.email, data.password, client_ip)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    data: RefreshRequest, db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    user = get_refresh_user(data.refresh_token, db)
    return auth_service.refresh(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    auth_service.logout(db, current_user)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser) -> UserOut:
    return current_user
