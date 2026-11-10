from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
import jwt
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel

from backend.core.config import settings

ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.SECRET_KEY


class TokenUser(BaseModel):
    user_id: str
    role: Literal["client", "freelancer"]
    name: str = ""


def create_access_token(
    user_id: str,
    role: Literal["client", "freelancer"],
    name: str = "",
    expires_minutes: int = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
) -> str:
    """Creates a cryptographically signed HMAC-SHA256 JWT."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "name": name,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodes and validates a signed JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or forged authentication token.",
        )


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> TokenUser:
    """
    FastAPI dependency requiring a valid Bearer JWT.
    Enforces ownership and identity strictly from the cryptographically verified token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Header: Authorization: Bearer <token>",
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    role = payload.get("role")
    name = payload.get("name", "")

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims: subject or role missing.",
        )

    return TokenUser(user_id=user_id, role=role, name=name)


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> Optional[TokenUser]:
    """Optional JWT dependency for public/browsing endpoints with demo header fallback."""
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ", 1)[1].strip()
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            role = payload.get("role")
            name = payload.get("name", "")
            if user_id and role:
                return TokenUser(user_id=user_id, role=role, name=name)
        except Exception:
            pass

    if x_user_id and x_user_role in ("client", "freelancer"):
        return TokenUser(user_id=x_user_id, role=x_user_role, name="")

    return None


def require_role(required_role: Literal["client", "freelancer"]):
    def role_checker(current_user: TokenUser = Depends(get_current_user)) -> TokenUser:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: this action requires '{required_role}' permissions. You are signed in as '{current_user.role}'.",
            )
        return current_user
    return role_checker


require_client = require_role("client")
require_freelancer = require_role("freelancer")
