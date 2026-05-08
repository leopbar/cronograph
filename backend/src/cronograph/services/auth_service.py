from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from cronograph.core.config import settings
from cronograph.core.security import (
    encode_access_token,
    gen_refresh_token,
    hash_refresh_token,
    verify_password,
)
from cronograph.models.access_blocklist import AccessBlocklist
from cronograph.models.audit_log import AuditLog
from cronograph.models.refresh_token import RefreshToken
from cronograph.models.user import User

_LOCKOUT_THRESHOLDS = [(5, 15), (10, 60)]  # (attempts, minutes)
_PERMANENT_LOCK_THRESHOLD = 15


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _audit(
    db: AsyncSession,
    event: str,
    request: Request,
    user_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        event=event,
        ip=_get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        metadata_=metadata,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)


async def login_user(
    db: AsyncSession,
    request: Request,
    username_or_email: str,
    password: str,
) -> tuple[str, str, str, User] | None:
    """Return (access_token, refresh_token, family_id, user) or None on failure."""
    stmt = select(User).where(
        (User.username == username_or_email) | (User.email == username_or_email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Always hash to prevent timing attack revealing user existence
    dummy_hash = "$argon2id$v=19$m=65536,t=3,p=4$dummydummydummy$dummydummydummydummydummydummydummydummydummy"
    candidate_hash = user.password_hash if user else dummy_hash

    password_ok = verify_password(password, candidate_hash)

    if not user or not password_ok:
        if user:
            await _handle_failed_attempt(db, request, user)
        else:
            await _audit(db, "login_failure", request, metadata={"reason": "user_not_found"})
        await db.commit()
        return None

    if not user.is_active:
        await _audit(db, "login_failure", request, user.id, {"reason": "account_inactive"})
        await db.commit()
        return None

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        await _audit(db, "login_failure", request, user.id, {"reason": "account_locked"})
        await db.commit()
        return None

    # Success — reset lockout, update last_login
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(
            failed_login_attempts=0,
            locked_until=None,
            last_login_at=now,
            updated_at=now,
        )
    )

    access_token, _ = encode_access_token(user.id, user.role)
    refresh_plain = gen_refresh_token()
    family_id = str(uuid4())

    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_plain),
        family_id=family_id,
        expires_at=now + timedelta(days=settings.REFRESH_TTL_DAYS),
        ip=_get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        created_at=now,
    )
    db.add(rt)
    await _audit(db, "login_success", request, user.id)
    await db.commit()
    return access_token, refresh_plain, family_id, user


async def _handle_failed_attempt(
    db: AsyncSession, request: Request, user: User
) -> None:
    attempts = user.failed_login_attempts + 1
    locked_until = None

    for threshold, minutes in _LOCKOUT_THRESHOLDS:
        if attempts >= threshold:
            locked_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    if attempts >= _PERMANENT_LOCK_THRESHOLD:
        locked_until = datetime(9999, 12, 31, tzinfo=timezone.utc)

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(
            failed_login_attempts=attempts,
            locked_until=locked_until,
            updated_at=datetime.now(timezone.utc),
        )
    )
    await _audit(
        db, "login_failure", request, user.id,
        {"attempts": attempts, "locked": locked_until is not None},
    )


async def refresh_tokens(
    db: AsyncSession,
    request: Request,
    refresh_plain: str,
) -> tuple[str, str, User] | None:
    """Rotate refresh token. Return (new_access, new_refresh, user) or None."""
    token_hash = hash_refresh_token(refresh_plain)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await db.execute(stmt)
    rt = result.scalar_one_or_none()

    if not rt:
        return None

    now = datetime.now(timezone.utc)

    # Reuse detected — revoke whole family
    if rt.revoked_at is not None:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == rt.family_id)
            .values(revoked_at=now)
        )
        await _audit(db, "refresh_reuse_detected", request, rt.user_id)
        await db.commit()
        return None

    if rt.expires_at < now:
        return None

    user_stmt = select(User).where(User.id == rt.user_id)
    user_result = await db.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        return None

    # Revoke old token, issue new pair
    await db.execute(
        update(RefreshToken).where(RefreshToken.id == rt.id).values(revoked_at=now)
    )

    access_token, _ = encode_access_token(user.id, user.role)
    new_refresh_plain = gen_refresh_token()

    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(new_refresh_plain),
        family_id=rt.family_id,
        expires_at=now + timedelta(days=settings.REFRESH_TTL_DAYS),
        ip=_get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        created_at=now,
    )
    db.add(new_rt)
    await db.commit()
    return access_token, new_refresh_plain, user


async def logout_user(
    db: AsyncSession,
    request: Request,
    jti: str,
    access_exp: datetime,
    refresh_plain: str | None,
    user_id: str,
) -> None:
    # Blocklist current access token
    bl = AccessBlocklist(jti=jti, expires_at=access_exp)
    db.add(bl)

    # Revoke refresh token
    if refresh_plain:
        token_hash = hash_refresh_token(refresh_plain)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .values(revoked_at=datetime.now(timezone.utc))
        )

    await _audit(db, "logout", request, user_id)
    await db.commit()


async def is_access_token_blocked(db: AsyncSession, jti: str) -> bool:
    stmt = select(AccessBlocklist).where(AccessBlocklist.jti == jti)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def change_password(
    db: AsyncSession,
    request: Request,
    user: User,
    new_password: str,
) -> None:
    from cronograph.core.security import hash_password
    now = datetime.now(timezone.utc)
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(
            password_hash=hash_password(new_password),
            must_change_password=False,
            updated_at=now,
        )
    )
    # Revoke all refresh tokens for this user
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await _audit(db, "password_changed", request, user.id)
    await db.commit()
