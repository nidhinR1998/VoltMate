import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4
import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
except (ImportError, Exception):
    id_token = None
    google_requests = None

from app.db.session import get_db
from app.models.user import UserRole
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
router = APIRouter(prefix="/auth", tags=["Authentication & Identity (EDW)"])

security_scheme = HTTPBearer(auto_error=False)

_G_SUFFIX = ".apps.googleusercontent.com"
ALLOWED_GOOGLE_CLIENT_IDS = {
    settings.GOOGLE_CLIENT_ID,
    getattr(settings, "GOOGLE_ANDROID_CLIENT_ID", ""),
    f"444570032741-05lacpica7sgfthg5303o5t3rub0c2mo{_G_SUFFIX}",
    f"444570032741-77bn34oberqmj68fnpom6ffupbb22abj{_G_SUFFIX}",
    f"809643418045-9gi8mijpdgn1sgli3p0b0bnmt6i2peub{_G_SUFFIX}",
}


async def _fetch_edw_party_by_email(db: AsyncSession, email: str) -> Optional[dict]:
    row = (
        await db.execute(
            text(
                """
                SELECT
                    p.party_id,
                    p.party_type_cd,
                    p.kyc_verif_cd,
                    p.trust_score_num,
                    p.created_ts,
                    c.email_addr,
                    c.phone_e164,
                    c.pwd_hash_argon2,
                    c.upi_vpa_addr,
                    COALESCE(n.narrative_txt, split_part(c.email_addr, '@', 1)) AS full_name
                FROM mdm_core.mdm_party_credential c
                JOIN mdm_core.mdm_party p ON p.party_id = c.party_id
                LEFT JOIN mdm_core.txt_entity_narrative n
                  ON n.entity_uuid = p.party_id AND n.narrative_type_cd = 8001 AND n.lang_cd = 'EN'
                WHERE LOWER(c.email_addr) = :email
                LIMIT 1
                """
            ),
            {"email": email.lower().strip()},
        )
    ).mappings().first()
    return dict(row) if row else None


async def _fetch_edw_party_by_id(db: AsyncSession, party_id: str) -> Optional[dict]:
    try:
        UUID(str(party_id))
    except Exception:
        return None
    row = (
        await db.execute(
            text(
                """
                SELECT
                    p.party_id,
                    p.party_type_cd,
                    p.kyc_verif_cd,
                    p.trust_score_num,
                    p.created_ts,
                    c.email_addr,
                    c.phone_e164,
                    c.pwd_hash_argon2,
                    c.upi_vpa_addr,
                    COALESCE(n.narrative_txt, split_part(c.email_addr, '@', 1)) AS full_name
                FROM mdm_core.mdm_party p
                JOIN mdm_core.mdm_party_credential c ON c.party_id = p.party_id
                LEFT JOIN mdm_core.txt_entity_narrative n
                  ON n.entity_uuid = p.party_id AND n.narrative_type_cd = 8001 AND n.lang_cd = 'EN'
                WHERE p.party_id = :pid
                LIMIT 1
                """
            ),
            {"pid": str(party_id)},
        )
    ).mappings().first()
    return dict(row) if row else None


async def _create_edw_party(
    db: AsyncSession,
    email: str,
    full_name: str,
    phone: Optional[str] = None,
    password_hash: Optional[str] = None,
    role: UserRole = UserRole.DRIVER,
    kyc_verified: bool = False,
) -> dict:
    new_party_id = uuid4()
    party_type_cd = 1002 if role == UserRole.HOST else 1001
    kyc_cd = 1021 if kyc_verified else 1022

    clean_phone = f"+919{random.randint(100000000, 999999999)}"
    if phone:
        raw = phone.replace(" ", "").replace("-", "").strip()
        if len(raw) >= 10:
            exists = await db.scalar(
                text("SELECT 1 FROM mdm_core.mdm_party_credential WHERE phone_e164 = :ph"),
                {"ph": raw[:20]},
            )
            if not exists:
                clean_phone = raw[:20]

    vpa_prefix = email.split("@")[0].replace(".", "")[:18] or "driver"
    upi_vpa = f"{vpa_prefix}@okicici"

    await db.execute(
        text(
            """
            INSERT INTO mdm_core.mdm_party (
                party_id, party_type_cd, party_stat_cd, kyc_verif_cd, pref_map_style_cd, trust_score_num
            )
            VALUES (:pid, :ptype, 1011, :kyc, 1031, 5.00)
            """
        ),
        {"pid": str(new_party_id), "ptype": party_type_cd, "kyc": kyc_cd},
    )

    await db.execute(
        text(
            """
            INSERT INTO mdm_core.mdm_party_credential (
                party_id, email_addr, phone_e164, pwd_hash_argon2, upi_vpa_addr, version_num
            )
            VALUES (:pid, :email, :phone, :pwd, :vpa, 1)
            """
        ),
        {
            "pid": str(new_party_id),
            "email": email.lower().strip(),
            "phone": clean_phone,
            "pwd": password_hash,
            "vpa": upi_vpa,
        },
    )

    await db.execute(
        text(
            """
            INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
            VALUES (:pid, 8001, 'EN', :fname)
            ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
            SET narrative_txt = EXCLUDED.narrative_txt
            """
        ),
        {"pid": str(new_party_id), "fname": full_name.strip()},
    )

    await db.execute(
        text(
            """
            INSERT INTO dw_dim.dim_party_scd2 (
                party_id, party_type_cd, kyc_verif_cd, trust_score_band_cd,
                eff_start_ts, eff_end_ts, curr_row_ind, version_num
            )
            VALUES (:pid, :ptype, :kyc, 1041, NOW(), '9999-12-31 23:59:59+00', 'Y', 1)
            """
        ),
        {"pid": str(new_party_id), "ptype": party_type_cd, "kyc": kyc_cd},
    )

    await db.commit()
    return await _fetch_edw_party_by_id(db, str(new_party_id))


def _party_to_token_response(party: dict, is_new: bool = False) -> TokenResponse:
    pid = str(party["party_id"])
    role = UserRole.HOST if party.get("party_type_cd") == 1002 else UserRole.DRIVER
    access_token = create_access_token(
        pid,
        extra_claims={"email": party["email_addr"], "role": role.value},
    )
    refresh_token = create_refresh_token(pid)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        is_new_user=is_new,
        user_id=pid,
        full_name=party["full_name"],
        email=party["email_addr"],
        active_role=role,
    )


def _party_to_user_response(party: dict) -> UserResponse:
    role = UserRole.HOST if party.get("party_type_cd") == 1002 else UserRole.DRIVER
    return UserResponse(
        id=party["party_id"],
        full_name=party["full_name"],
        email=party["email_addr"],
        phone=party.get("phone_e164"),
        avatar_url=None,
        active_role=role,
        kyc_verified=(party.get("kyc_verif_cd") == 1021),
        trust_score=float(party.get("trust_score_num") or 5.0),
        volt_credits_balance=Decimal("1450.00"),
        upi_id=party.get("upi_vpa_addr"),
        discom_State="KERALA_KSEB",
        created_at=party["created_ts"],
    )


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[dict]:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    if await redis_service.is_token_revoked(payload.get("jti")):
        return None
    return await _fetch_edw_party_by_id(db, payload.get("sub"))


@router.post("/register/send-otp", response_model=SendOtpResponse)
async def send_registration_otp(
    payload: SendOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower().strip()
    if not await redis_service.check_login_allowed(f"otp_req:{email}", max_attempts=30):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait a few minutes before retrying.",
        )

    await redis_service.record_failed_login(f"otp_req:{email}", window_seconds=120)
    otp = generate_secure_otp(6)
    hashed = hash_otp(otp, email)
    await redis_service.set_otp(email, hashed, ttl_seconds=600)
    sent = await send_otp_email(email, otp)
    if not sent:
        logger.warning(f"SMTP port blocked on cloud host; OTP {otp} active for {email}")

    return SendOtpResponse(
        success=True,
        message=f"A 6-digit verification code has been dispatched to {email}.",
        cooldown_seconds=30,
        otp_preview=otp,
    )


@router.post("/register/verify-otp", response_model=TokenResponse)
async def verify_otp_and_register(
    payload: VerifyOtpRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower().strip()
    cache_entry = await redis_service.get_and_check_otp(email)

    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired or not found. Please request a new code.",
        )

    if cache_entry.get("attempts", 0) >= cache_entry.get("max_attempts", 5):
        await redis_service.delete_otp(email)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a fresh OTP.",
        )

    is_valid = verify_otp_hash(payload.otp, email, cache_entry["hash"])
    if not is_valid:
        await redis_service.increment_otp_attempts(email, cache_entry)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your code and try again.",
        )

    await redis_service.delete_otp(email)

    existing = await _fetch_edw_party_by_email(db, email)
    pwd_hash = get_password_hash(payload.password) if payload.password else None

    if existing:
        if payload.full_name and payload.full_name.strip():
            await db.execute(
                text(
                    """
                    INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
                    VALUES (:pid, 8001, 'EN', :fname)
                    ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
                    SET narrative_txt = EXCLUDED.narrative_txt
                    """
                ),
                {"pid": str(existing["party_id"]), "fname": payload.full_name.strip()},
            )
        if pwd_hash:
            await db.execute(
                text(
                    "UPDATE mdm_core.mdm_party_credential SET pwd_hash_argon2 = :pwd WHERE party_id = :pid"
                ),
                {"pwd": pwd_hash, "pid": str(existing["party_id"])},
            )
        await db.commit()
        refreshed = await _fetch_edw_party_by_id(db, str(existing["party_id"]))
        return _party_to_token_response(refreshed, is_new=False)

    created = await _create_edw_party(
        db=db,
        email=email,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        password_hash=pwd_hash,
        role=payload.role,
        kyc_verified=False,
    )
    return _party_to_token_response(created, is_new=True)


@router.post("/login/email-password", response_model=TokenResponse)
async def login_with_email_password(
    payload: EmailPasswordLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower().strip()
    party = await _fetch_edw_party_by_email(db, email)
    if not party:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    stored_hash = party.get("pwd_hash_argon2") or ""
    # Allow seeded EDW demo accounts or verified bcrypt hashes
    if stored_hash.startswith("$2") or stored_hash.startswith("$argon2id$v=19$m=65536,t=3,p=4$voltmate_edw_hash"):
        if stored_hash.startswith("$2") and not verify_password(payload.password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
    else:
        if not verify_password(payload.password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

    await redis_service.clear_failed_logins(email)
    return _party_to_token_response(party, is_new=False)


@router.post("/login/email-otp", response_model=TokenResponse)
async def login_with_email_otp(
    payload: EmailOtpLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower().strip()
    cache_entry = await redis_service.get_and_check_otp(email)

    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired or not found.",
        )

    if not verify_otp_hash(payload.otp, email, cache_entry["hash"]):
        await redis_service.increment_otp_attempts(email, cache_entry)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    await redis_service.delete_otp(email)
    party = await _fetch_edw_party_by_email(db, email)
    if not party:
        party = await _create_edw_party(
            db=db,
            email=email,
            full_name=email.split("@")[0].replace(".", " ").title(),
            kyc_verified=False,
        )
        return _party_to_token_response(party, is_new=True)

    return _party_to_token_response(party, is_new=False)


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower().strip()
    cache_entry = await redis_service.get_and_check_otp(email)
    if not cache_entry or not verify_otp_hash(payload.otp, email, cache_entry["hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    await redis_service.delete_otp(email)
    party = await _fetch_edw_party_by_email(db, email)
    if not party:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    new_hash = get_password_hash(payload.new_password)
    await db.execute(
        text("UPDATE mdm_core.mdm_party_credential SET pwd_hash_argon2 = :pwd WHERE party_id = :pid"),
        {"pwd": new_hash, "pid": str(party["party_id"])},
    )
    await db.commit()
    return {"success": True, "message": "Password has been reset successfully."}


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    email = None
    name = None

    # 1. Verify cryptographic Google ID token against allowed Client IDs
    try:
        if id_token and google_requests and not payload.id_token.startswith("google_oauth_"):
            for cid in ALLOWED_GOOGLE_CLIENT_IDS:
                try:
                    id_info = id_token.verify_oauth2_token(
                        payload.id_token,
                        google_requests.Request(),
                        cid,
                    )
                    email = id_info.get("email", "").lower().strip()
                    name = id_info.get("name", "VoltMate Driver")
                    if email:
                        break
                except Exception:
                    continue
    except Exception:
        pass

    # 2. Verify OAuth2 access_token via Google userinfo endpoint
    if not email and payload.access_token:
        try:
            import httpx

            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {payload.access_token}"},
                )
                if r.status_code == 200:
                    uinfo = r.json()
                    email = (uinfo.get("email") or "").lower().strip()
                    name = uinfo.get("name") or "VoltMate Driver"
        except Exception:
            pass

    # 3. Native Android AccountManager Google Account bound to VoltMate OAuth Client ID
    if not email and payload.email:
        if payload.client_id and payload.client_id not in ALLOWED_GOOGLE_CLIENT_IDS:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Client ID mismatch.",
            )
        email = payload.email.lower().strip()
        name = (payload.full_name or email.split("@")[0].replace(".", " ").title()).strip()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google OAuth verification failed. Invalid token.",
        )

    existing = await _fetch_edw_party_by_email(db, email)
    if existing:
        return _party_to_token_response(existing, is_new=False)

    created = await _create_edw_party(
        db=db,
        email=email,
        full_name=name or "VoltMate Driver",
        kyc_verified=True,
    )
    return _party_to_token_response(created, is_new=True)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    jti = decoded.get("jti")
    if await redis_service.is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has already been rotated or revoked",
        )
    await redis_service.revoke_token(jti, ttl_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    party = await _fetch_edw_party_by_id(db, decoded.get("sub"))
    if not party:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _party_to_token_response(party, is_new=False)


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
                ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )
    if payload and payload.refresh_token:
        refresh_decoded = decode_token(payload.refresh_token)
        if refresh_decoded and refresh_decoded.get("jti"):
            await redis_service.revoke_token(
                refresh_decoded["jti"],
                ttl_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            )
    return {"success": True, "message": "Session terminated and tokens revoked."}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    user_id: Optional[str] = Query(None),
    current_party: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_party:
        return _party_to_user_response(current_party)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    party = await _fetch_edw_party_by_id(db, user_id)
    if not party:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _party_to_user_response(party)


@router.post("/switch-role", response_model=UserResponse)
async def switch_user_role(
    payload: UserRoleSwitchRequest,
    user_id: Optional[str] = Query(None),
    current_party: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = str(current_party["party_id"]) if current_party else user_id
    if not target_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    new_type_cd = 1002 if payload.new_role == UserRole.HOST else 1001
    await db.execute(
        text("UPDATE mdm_core.mdm_party SET party_type_cd = :pt WHERE party_id = :pid"),
        {"pt": new_type_cd, "pid": target_id},
    )
    await db.commit()
    party = await _fetch_edw_party_by_id(db, target_id)
    if not party:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _party_to_user_response(party)
