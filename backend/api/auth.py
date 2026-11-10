from typing import Literal, Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import create_access_token, get_current_user, TokenUser
from backend.core.database import get_db
from backend.models.models import User, DEFAULT_DEMO_USERS

router = APIRouter(tags=["auth"])


class DemoLoginRequest(BaseModel):
    user_id: Optional[str] = None
    role: Literal["client", "freelancer"]
    name: Optional[str] = None


class DemoLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str


class DemoUserItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    title: Optional[str] = None


@router.get("/api/auth/demo-users", response_model=List[DemoUserItem])
async def list_demo_users():
    """Returns available pre-configured demo user accounts."""
    return DEFAULT_DEMO_USERS


@router.post("/api/auth/demo-login", response_model=DemoLoginResponse)
@router.post("/api/demo-login", response_model=DemoLoginResponse)
async def demo_login(req: DemoLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Issues a cryptographically signed HMAC-SHA256 JWT for client or freelancer demo sessions.
    Accepts either an explicit user_id (e.g. client-maya, freelancer-arjun) or sets default by role.
    """
    user_id = req.user_id
    name = req.name

    if not user_id or user_id in ("client_default", "client-default"):
        if req.role == "client":
            user_id = "client_maya"
            name = name or "Maya Patel"
        else:
            user_id = "freelancer_arjun"
            name = name or "Arjun Kumar"
    elif user_id in ("freelancer_default", "freelancer-default"):
        user_id = "freelancer_arjun"
        name = name or "Arjun Kumar"
    else:
        # Match from demo users if name not provided
        match = next((u for u in DEFAULT_DEMO_USERS if u["id"].replace("-", "_") == user_id.replace("-", "_")), None)
        if match:
            name = name or match["name"]
        else:
            name = name or user_id.replace("-", " ").title()

    token = create_access_token(user_id=user_id, role=req.role, name=name)

    return DemoLoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user_id,
        role=req.role,
        name=name,
    )


@router.get("/api/me")
async def get_me(current_user: TokenUser = Depends(get_current_user)):
    """Returns the authenticated user details from the verified token."""
    return {
        "user_id": current_user.user_id,
        "role": current_user.role,
        "name": current_user.name,
    }
