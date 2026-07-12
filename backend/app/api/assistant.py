from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrgId, get_current_user
from app.models import User
from app.services import assistant_service

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AssistantAsk(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class AssistantResponse(BaseModel):
    configured: bool
    answer: str


@router.get("/status")
def assistant_status(_: Annotated[User, Depends(get_current_user)]) -> dict:
    return {"configured": assistant_service.is_configured()}


@router.post("/ask", response_model=AssistantResponse)
def ask(
    data: AssistantAsk,
    db: Annotated[Session, Depends(get_db)],
    org_id: OrgId,
) -> AssistantResponse:
    result = assistant_service.ask(db, org_id, data.question)
    return AssistantResponse(**result)
