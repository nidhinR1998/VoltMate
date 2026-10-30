import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
except (ImportError, Exception):
    id_token = None
    google_requests = None

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRegisterRequest,
    EmailPasswordLoginRequest,
    EmailOtpLoginRequest,
    PasswordResetConfirmRequest,
    GoogleAuthRequest,
    TokenResponse,
    RefreshTokenRequest,
    LogoutRequest,
)
from app.schemas.user import UserResponse, UserRoleSwitchRequest
from app.core.security import (
    generate_secure_otp,
    hash_otp,
    verify_otp_hash,
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.smtp_mailer import send_otp_email
from app.core.config import settings
from app.services.redis_service import redis_service

logger = logging.getLogger("voltmate.api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    jti = payload.get("jti")
    if await redis_service.is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
    return user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if await redis_service.is_token_revoked(payload.get("jti")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    stmt = select(User).where(User.id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


def build_token_response(user: User, is_new: bool = False) -> TokenResponse:
    access_token = create_access_token(
        str(user.id),
        extra_claims={"email": user.email, "role": user.active_role.value}
    )
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        is_new_user=is_new,
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        active_role=user.active_role,
    )


@router.post("/register/send-otp", response_model=SendOtpResponse)
async def send_registration_otp(
    payload: SendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    email = payload.email.lower().strip()
    if not await redis_service.check_login_allowed(f"otp_req:{email}", max_attempts=5):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait a few minutes before retrying."
        )

    if payload.purpose == "REGISTER":
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please log in."
            )

    await redis_service.record_failed_login(f"otp_req:{email}", window_seconds=300)
    otp = generate_secure_otp(6)
    hashed = hash_otp(otp, email)
    await redis_service.set_otp(email, hashed, ttl_seconds=300)
    await send_otp_email(email, otp)

    return SendOtpResponse(
        success=True,
        message="A 6-digit verification code has been dispatched to your email.",
        cooldown_seconds=60
    )


@router.post("/register/verify-otp", response_model=TokenResponse)
async def verify_otp_and_register(
    payload: VerifyOtpRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    email = payload.email.lower().strip()
    cache_entry = await redis_service.get_and_check_otp(email)

    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired or not found. Please request a new code."
        )

    if cache_entry.get("attempts", 0) >= cache_entry.get("max_attempts", 3):
        await redis_service.delete_otp(email)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a fresh OTP."
        )

    is_valid = verify_otp_hash(payload.otp, email, cache_entry["hash"])
    if not is_valid:
        await redis_service.increment_otp_attempts(email, cache_entry)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email and try again."
        )

    await redis_service.delete_otp(email)

    stmt = select(User).where(User.email == email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return build_token_response(existing, is_new=False)

    pwd_hash = get_password_hash(payload.password) if payload.password else None
    new_user = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone,
        password_hash=pwd_hash,
        active_role=payload.role,
        kyc_verified=False,
        trust_score=5.0,
        volt_credits_balance=100.00,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)

    return build_token_response(new_user, is_new=True)


@router.post("/login/email-password", response_model=TokenResponse)
async def login_with_email_password(
    payload: EmailPasswordLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    email = payload.email.lower().strip()

    if not await redis_service.check_login_allowed(email, max_attempts=5):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes."
        )

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Constant-time verification even if user is None
    password_ok = verify_password(payload.password, user.password_hash if user else None)
    if not user or not password_ok:
        await redis_service.record_failed_login(email, window_seconds=900)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    await redis_service.clear_failed_logins(email)
    return build_token_response(user, is_new=False)


@router.post("/login/email-otp", response_model=TokenResponse)
async def login_with_email_otp(
    payload: EmailOtpLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    email = payload.email.lower().strip()
    cache_entry = await redis_service.get_and_check_otp(email)

    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired or not found."
        )

    if cache_entry.get("attempts", 0) >= cache_entry.get("max_attempts", 3):
        await redis_service.delete_otp(email)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a fresh OTP."
        )

    if not verify_otp_hash(payload.otp, email, cache_entry["hash"]):
        await redis_service.increment_otp_attempts(email, cache_entry)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code."
        )

    await redis_service.delete_otp(email)

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        user = User(
            full_name=email.split("@")[0].title(),
            email=email,
            active_role=UserRole.DRIVER,
            kyc_verified=False,
            trust_score=5.0,
            volt_credits_balance=100.00
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return build_token_response(user, is_new=True)

    return build_token_response(user, is_new=False)


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    email = payload.email.lower().strip()
    cache_entry = await redis_service.get_and_check_otp(email)

    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired or not found."
        )

    if cache_entry.get("attempts", 0) >= cache_entry.get("max_attempts", 3):
        await redis_service.delete_otp(email)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new code."
        )

    if not verify_otp_hash(payload.otp, email, cache_entry["hash"]):
        await redis_service.increment_otp_attempts(email, cache_entry)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code."
        )

    await redis_service.delete_otp(email)

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    user.password_hash = get_password_hash(payload.new_password)
    await redis_service.clear_failed_logins(email)
    return {"success": True, "message": "Password has been reset successfully."}


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        if not id_token or not google_requests:
            raise ValueError("Google auth library unavailable")
        id_info = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        google_sub = id_info.get("sub")
        email = id_info.get("email", "").lower().strip()
        name = id_info.get("name", "VoltMate Driver")
        picture = id_info.get("picture")
    except Exception:
        if settings.APP_ENV == "development" and payload.id_token.startswith("mock_google_token_"):
            email = f"google_user_{payload.id_token[-4:]}@gmail.com"
            google_sub = f"sub_{payload.id_token[-8:]}"
            name = "Google Test Pilot"
            picture = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google OAuth verification failed. Invalid token."
            )

    stmt = select(User).where((User.google_sub_id == google_sub) | (User.email == email))
    user = (await db.execute(stmt)).scalar_one_or_none()

    is_new = False
    if not user:
        is_new = True
        user = User(
            full_name=name,
            email=email,
            google_sub_id=google_sub,
            avatar_url=picture,
            active_role=UserRole.DRIVER,
            kyc_verified=True,
            trust_score=5.0,
            volt_credits_balance=100.00,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    else:
        if not user.google_sub_id:
            user.google_sub_id = google_sub
        if picture and not user.avatar_url:
            user.avatar_url = picture

    return build_token_response(user, is_new=is_new)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    jti = decoded.get("jti")
    if await redis_service.is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has already been rotated or revoked"
        )

    # Rotate: immediately revoke the consumed refresh token
    await redis_service.revoke_token(jti, ttl_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    user_id = decoded.get("sub")
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return build_token_response(user, is_new=False)


@router.post("/logout")
async def logout_session(
    payload: Optional[LogoutRequest] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
):
    if credentials and credentials.credentials:
        access_decoded = decode_token(credentials.credentials)
        if access_decoded and access_decoded.get("jti"):
            await redis_service.revoke_token(
                access_decoded["jti"],
                ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
    if payload and payload.refresh_token:
        refresh_decoded = decode_token(payload.refresh_token)
        if refresh_decoded and refresh_decoded.get("jti"):
            await redis_service.revoke_token(
                refresh_decoded["jti"],
                ttl_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
            )
    return {"success": True, "message": "Session terminated and tokens revoked."}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    user_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user:
        if user_id and str(current_user.id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot access another user's profile"
            )
        return current_user

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/switch-role", response_model=UserResponse)
async def switch_user_role(
    payload: UserRoleSwitchRequest,
    user_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user:
        if user_id and str(current_user.id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot modify another user's role"
            )
        current_user.active_role = payload.new_role
        return current_user

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.active_role = payload.new_role
    return user
