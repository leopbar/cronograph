from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from cronograph.api.deps import get_db, require_admin
from cronograph.core.security import (
    gen_temp_password,
    hash_password,
)
from cronograph.models.audit_log import AuditLog
from cronograph.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    role: str
    is_active: bool
    must_change_password: bool
    failed_login_attempts: int
    locked_until: datetime | None
    last_login_at: datetime | None
    created_at: datetime


class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str
    role: str = "user"


class UpdateUserRequest(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    role: str | None = None
    is_active: bool | None = None


class TempPasswordOut(BaseModel):
    temp_password: str


class AuditLogOut(BaseModel):
    id: int
    user_id: str | None
    event: str
    ip: str | None
    user_agent: str | None
    metadata: dict | None
    created_at: datetime


def _to_user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        email=u.email,
        username=u.username,
        role=u.role,
        is_active=u.is_active,
        must_change_password=u.must_change_password,
        failed_login_attempts=u.failed_login_attempts,
        locked_until=u.locked_until,
        last_login_at=u.last_login_at,
        created_at=u.created_at,
    )


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[UserOut]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [_to_user_out(u) for u in result.scalars().all()]


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> TempPasswordOut:
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Invalid role")

    stmt = select(User).where(
        (User.email == body.email) | (User.username == body.username)
    )
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already exists")

    temp_pwd = gen_temp_password()
    now = datetime.now(timezone.utc)
    user = User(
        email=body.email,
        username=body.username,
        password_hash=hash_password(temp_pwd),
        role=body.role,
        must_change_password=True,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.flush()

    log = AuditLog(
        user_id=admin.id,
        event="user_created",
        metadata_={"new_user_id": user.id, "username": body.username, "role": body.role},
        created_at=now,
    )
    db.add(log)
    await db.commit()
    return TempPasswordOut(temp_password=temp_pwd)


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.email is not None:
        updates["email"] = body.email
    if body.username is not None:
        updates["username"] = body.username
    if body.role is not None:
        if body.role not in ("admin", "user"):
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = body.role
    if body.is_active is not None:
        updates["is_active"] = body.is_active

    await db.execute(update(User).where(User.id == user_id).values(**updates))

    log = AuditLog(
        user_id=admin.id,
        event="user_updated",
        metadata_={"target_user_id": user_id, "changes": {k: str(v) for k, v in updates.items() if k != "updated_at"}},
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return _to_user_out(user)


@router.post("/users/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> TempPasswordOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_pwd = gen_temp_password()
    now = datetime.now(timezone.utc)
    await db.execute(
        update(User).where(User.id == user_id).values(
            password_hash=hash_password(temp_pwd),
            must_change_password=True,
            updated_at=now,
        )
    )
    log = AuditLog(
        user_id=admin.id,
        event="password_reset_by_admin",
        metadata_={"target_user_id": user_id},
        created_at=now,
    )
    db.add(log)
    await db.commit()
    return TempPasswordOut(temp_password=temp_pwd)


@router.post("/users/{user_id}/unlock")
async def unlock_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    await db.execute(
        update(User).where(User.id == user_id).values(
            failed_login_attempts=0,
            locked_until=None,
            updated_at=now,
        )
    )
    log = AuditLog(
        user_id=admin.id,
        event="user_unlocked",
        metadata_={"target_user_id": user_id},
        created_at=now,
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return _to_user_out(user)


@router.get("/audit-log")
async def get_audit_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AuditLogOut]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return [
        AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            event=log.event,
            ip=log.ip,
            user_agent=log.user_agent,
            metadata=log.metadata_,
            created_at=log.created_at,
        )
        for log in result.scalars().all()
    ]
