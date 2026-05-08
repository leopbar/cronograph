import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from cronograph.core.config import settings

_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

_TEMP_PASSWORD_CHARS = string.ascii_letters + string.digits + "!@#$%^&*"


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def gen_temp_password(length: int = 16) -> str:
    return "".join(secrets.choice(_TEMP_PASSWORD_CHARS) for _ in range(length))


def validate_password_strength(password: str) -> str | None:
    """Return error message or None if valid."""
    if len(password) < 12:
        return "Password must be at least 12 characters"
    classes = [
        any(c.isupper() for c in password),
        any(c.islower() for c in password),
        any(c.isdigit() for c in password),
        any(c in string.punctuation for c in password),
    ]
    if sum(classes) < 3:
        return "Password must contain at least 3 of: uppercase, lowercase, numbers, symbols"
    return None


def encode_access_token(user_id: str, role: str) -> tuple[str, str]:
    """Return (token, jti)."""
    jti = str(uuid4())
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TTL_MIN),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token, jti


def decode_access_token(token: str) -> dict[str, Any]:
    """Raise jwt.PyJWTError on invalid/expired."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def gen_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
