from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
import jwt
from fastapi import Header, HTTPException, status

from backend.core.config import settings

ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.SECRET_KEY


def create_access_token(
    user_id: str,
    role: Literal["client", "freelancer"],
    expires_minutes: int = 1440,
) -> str:
    """Creates a cryptographically signed HMAC-SHA256 JWT."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
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
            detail="Session token has expired. Please re-authenticate via /api/demo-login.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or forged authentication token.",
        )


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    FastAPI dependency requiring a valid Bearer JWT.
    Returns: {"user_id": str, "role": "client" | "freelancer"}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required in Authorization: Bearer <token> header. Authenticate via /api/demo-login.",
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    role = payload.get("role")
    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims: sub or role missing.",
        )
    return {"user_id": user_id, "role": role}


async def get_optional_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Optional JWT dependency for public browsing endpoints."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        return {"user_id": payload.get("sub"), "role": payload.get("role")}
    except Exception:
        return None
