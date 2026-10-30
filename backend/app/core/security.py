import hmac
import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access"
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh"
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

def generate_secure_otp(length: int = 6) -> str:
    """Generates a cryptographically strong N-digit decimal OTP."""
    rng = secrets.SystemRandom()
    return "".join(rng.choice(string.digits) for _ in range(length))

def hash_otp(otp: str, email: str) -> str:
    """Hashes OTP with HMAC-SHA256 keyed with server SECRET_KEY and bound to email."""
    key = settings.SECRET_KEY.encode("utf-8")
    msg = f"{email.lower().strip()}:{otp}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

def verify_otp_hash(provided_otp: str, email: str, stored_hash: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    computed = hash_otp(provided_otp, email)
    return hmac.compare_digest(computed, stored_hash)

def generate_session_pin() -> str:
    """Generates 4-digit check-in PIN."""
    rng = secrets.SystemRandom()
    return f"{rng.randint(1000, 9999)}"

def generate_gate_pass_code() -> str:
    """Generates 6-character alphanumeric gate pass code (e.g. VM789A)."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    rng = secrets.SystemRandom()
    return "".join(rng.choice(chars) for _ in range(6))

