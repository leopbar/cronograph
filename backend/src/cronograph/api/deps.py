from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import jwt

from cronograph.core.db import get_db
from cronograph.core.security import decode_access_token
from cronograph.models.user import User
from cronograph.services.auth_service import is_access_token_blocked

_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


async def get_current_user(
    request: Request,
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
    if not access_token:
        raise credentials_exc
    try:
        payload = decode_access_token(access_token)
    except jwt.PyJWTError:
        raise credentials_exc

    jti: str = payload.get("jti", "")
    user_id: str = payload.get("sub", "")

    if not user_id or not jti:
        raise credentials_exc

    if await is_access_token_blocked(db, jti):
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exc

    # CSRF check for mutating methods
    if request.method not in _CSRF_SAFE_METHODS:
        csrf_cookie = request.cookies.get("csrf_token", "")
        csrf_header = request.headers.get("X-CSRF-Token", "")
        if not csrf_cookie or csrf_cookie != csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing or invalid",  # keep technical, visible to devs only
            )

    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",  # English intentional
        )
    return user
