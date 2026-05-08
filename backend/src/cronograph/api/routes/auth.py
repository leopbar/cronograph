import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from cronograph.api.deps import get_current_user
from cronograph.core.config import settings
from cronograph.core.db import get_db
from cronograph.core.security import validate_password_strength
from cronograph.middleware.rate_limit import limiter
from cronograph.models.user import User
from cronograph.services.auth_service import (
    change_password,
    login_user,
    logout_user,
    refresh_tokens,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    domain = settings.COOKIE_DOMAIN
    secure = settings.COOKIE_SECURE

    response.set_cookie(
        "access_token", access_token,
        max_age=settings.ACCESS_TTL_MIN * 60,
        path="/",
        domain=domain,
        secure=secure,
        httponly=True,
        samesite="lax",
    )
    response.set_cookie(
        "refresh_token", refresh_token,
        max_age=settings.REFRESH_TTL_DAYS * 86400,
        path="/auth/refresh",
        domain=domain,
        secure=secure,
        httponly=True,
        samesite="lax",
    )
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        "csrf_token", csrf_token,
        max_age=settings.ACCESS_TTL_MIN * 60,
        path="/",
        domain=domain,
        secure=secure,
        httponly=False,
        samesite="lax",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    response.delete_cookie("csrf_token", path="/")


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    role: str
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
@limiter.limit("5/15minutes;10/hour")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await login_user(db, request, body.username, body.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token, refresh_token, _family_id, user = result

    response = Response(
        content=UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            must_change_password=user.must_change_password,
        ).model_dump_json(),
        media_type="application/json",
    )
    _set_auth_cookies(response, access_token, refresh_token)
    return response


@router.post("/refresh")
@limiter.limit("60/hour")
async def refresh(
    request: Request,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Response:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    result = await refresh_tokens(db, request, refresh_token)
    if result is None:
        response = Response(status_code=status.HTTP_401_UNAUTHORIZED)
        _clear_auth_cookies(response)
        return response

    access_token, new_refresh, user = result
    response = Response(
        content=UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            must_change_password=user.must_change_password,
        ).model_dump_json(),
        media_type="application/json",
    )
    _set_auth_cookies(response, access_token, new_refresh)
    return response


@router.post("/logout")
async def logout(
    request: Request,
    access_token: str | None = Cookie(default=None),
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    import jwt as _jwt
    from cronograph.core.security import decode_access_token
    jti = ""
    exp = datetime.now(timezone.utc)
    if access_token:
        try:
            payload = decode_access_token(access_token)
            jti = payload.get("jti", "")
            exp_ts = payload.get("exp", 0)
            exp = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
        except _jwt.PyJWTError:
            pass

    await logout_user(db, request, jti, exp, refresh_token, current_user.id)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    _clear_auth_cookies(response)
    return response


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        role=current_user.role,
        must_change_password=current_user.must_change_password,
    )


@router.post("/change-password")
async def change_pwd(
    request: Request,
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    from cronograph.core.security import verify_password
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    error = validate_password_strength(body.new_password)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    await change_password(db, request, current_user, body.new_password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
