import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
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
    GoogleAuthRequest,
    TokenResponse,
    RefreshTokenRequest,
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

async def get_current_user(
    token_str: str,
    db: AsyncSession
) -> User:
    payload = decode_token(token_str)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
    return user

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
    
    # If registering, check if already registered
    if payload.purpose == "REGISTER":
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please log in."
            )

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

    # Invalidate OTP on success
    await redis_service.delete_otp(email)

    # Check if duplicate email before creation
    stmt = select(User).where(User.email == email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return build_token_response(existing, is_new=False)

    pwd_hash = get_password_hash(payload.password) if payload.password else None
    new_user = User(
        full_name=payload.full_name,
        email=email,
        phone=payload.phone,
        password_hash=pwd_hash,
        active_role=payload.role,
        kyc_verified=False,
        trust_score=5.0,
        volt_credits_balance=100.00, # 100 Welcome credits for testing!
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
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

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
        # Create minimal profile for passwordless user
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

@router.post("/google", response_model=TokenResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verify Google ID token using Google's public certs (Zero Cost)
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
        # Fallback for dev / mock tokens
        if payload.id_token.startswith("mock_google_token_"):
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
            kyc_verified=True, # Auto-verified via Google
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

    user_id = decoded.get("sub")
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return build_token_response(user, is_new=False)

@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/switch-role", response_model=UserResponse)
async def switch_user_role(
    user_id: str,
    payload: UserRoleSwitchRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.active_role = payload.new_role
    return user

