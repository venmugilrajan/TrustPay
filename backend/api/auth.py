from typing import Literal
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from backend.core.auth import create_access_token

router = APIRouter(prefix="/api", tags=["auth"])


class DemoLoginRequest(BaseModel):
    user_id: str = Field(min_length=1, description="Demo user identifier e.g. client_demo, freelancer_alex")
    role: Literal["client", "freelancer"] = Field(description="Role: client or freelancer")


class DemoLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


@router.post("/demo-login", response_model=DemoLoginResponse)
async def demo_login(req: DemoLoginRequest):
    """
    Issues a cryptographically signed HMAC-SHA256 JWT for client or freelancer demo sessions.
    Used for verifying ownership, role boundaries, and private data isolation.
    """
    token = create_access_token(user_id=req.user_id, role=req.role)
    return DemoLoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=req.user_id,
        role=req.role,
    )

