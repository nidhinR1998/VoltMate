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
GOOGLE_VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
KV_ATTR_GOOGLE_SUB = 9011


def get_allowed_google_client_ids() -> set[str]:
    extra = {
        c.strip()
        for c in (getattr(settings, "GOOGLE_EXTRA_CLIENT_IDS", "") or "").split(",")
        if c.strip()
    }
    configured = {
        (settings.GOOGLE_CLIENT_ID or "").strip(),
        (getattr(settings, "GOOGLE_ANDROID_CLIENT_ID", "") or "").strip(),
        f"444570032741-05lacpica7sgfthg5303o5t3rub0c2mo{_G_SUFFIX}",
        f"444570032741-77bn34oberqmj68fnpom6ffupbb22abj{_G_SUFFIX}",
        f"809643418045-9gi8mijpdgn1sgli3p0b0bnmt6i2peub{_G_SUFFIX}",
    } | extra
    return {cid for cid in configured if cid}


ALLOWED_GOOGLE_CLIENT_IDS = get_allowed_google_client_ids()


def verify_google_id_token(raw_token: str) -> dict:
    """
    Cryptographically verifies a Google ID token using google.oauth2.id_token:
    - Rejects missing, malformed, or fabricated 'google_oauth_*' tokens
    - Verifies RS256 signature and expiry via Google JWKS certs
    - Enforces iss in ('accounts.google.com', 'https://accounts.google.com')
    - Enforces aud in configured OAuth Client IDs (and azp when present)
    - Enforces email_verified is True and non-empty sub + email
    """
    clean_token = (raw_token or "").strip()
    if not clean_token or clean_token.startswith("google_oauth_") or clean_token.count(".") != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token format.",
        )

    if not id_token or not google_requests:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google token verification library is unavailable on the server.",
        )

    allowed_audiences = get_allowed_google_client_ids()
    if not allowed_audiences:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth Client IDs are not configured on the server.",
        )

    try:
        id_info = id_token.verify_oauth2_token(
            clean_token,
            google_requests.Request(),
            audience=None,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google ID token verification failed: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify Google ID token with Google certificates.",
        ) from exc

    issuer = str(id_info.get("iss") or "").strip()
    if issuer not in GOOGLE_VALID_ISSUERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token issuer.",
        )

    aud = str(id_info.get("aud") or "").strip()
    azp = str(id_info.get("azp") or "").strip()
    if aud not in allowed_audiences and (not azp or azp not in allowed_audiences):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID token audience does not match VoltMate OAuth client ID.",
        )

    if id_info.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is not verified.",
        )

    google_sub = str(id_info.get("sub") or "").strip()
    email = str(id_info.get("email") or "").lower().strip()
    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID token is missing required subject (sub) or email claim.",
        )

    full_name = str(id_info.get("name") or email.split("@")[0].replace(".", " ").title()).strip()
    return {
        "sub": google_sub,
        "email": email,
        "email_verified": True,
        "name": full_name or "VoltMate Driver",
        "picture": id_info.get("picture"),
    }


async def _ensure_google_sub_reference_code(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            INSERT INTO ref_mdm.cd_reference_value (ref_cd, domain_cd, std_code, sort_seq, active_ind)
            VALUES (9011, 90, 'KV_GOOGLE_SUB', 11, 'Y')
            ON CONFLICT (ref_cd) DO NOTHING
            """
        )
    )


_PARTY_BASE_SELECT_SQL = """
    SELECT
        p.party_id,
        p.party_type_cd,
        p.party_stat_cd,
        p.kyc_verif_cd,
        p.trust_score_num,
        p.created_ts,
        c.email_addr,
        c.phone_e164,
        c.pwd_hash_argon2,
        c.upi_vpa_addr,
        COALESCE(n.narrative_txt, split_part(c.email_addr, '@', 1)) AS full_name,
        kv.val_short_code AS google_sub,
        COALESCE((
            SELECT l.running_bal_inr
            FROM dw_fact.fact_wallet_ledger l
            JOIN dw_dim.dim_party_scd2 dp ON dp.party_sk = l.party_sk
            WHERE dp.party_id = p.party_id
            ORDER BY l.ledger_fact_id DESC
            LIMIT 1
        ), 0.00) AS wallet_balance_inr
    FROM mdm_core.mdm_party p
    JOIN mdm_core.mdm_party_credential c ON c.party_id = p.party_id
    LEFT JOIN mdm_core.txt_entity_narrative n
      ON n.entity_uuid = p.party_id AND n.narrative_type_cd = 8001 AND n.lang_cd = 'EN'
    LEFT JOIN mdm_core.kv_entity_attribute kv
      ON kv.entity_uuid = p.party_id AND kv.attr_key_cd = 9011
"""


async def _fetch_edw_party_where(db: AsyncSession, where_sql: str, params: dict) -> Optional[dict]:
    row = (
        await db.execute(
            text(f"{_PARTY_BASE_SELECT_SQL} WHERE {where_sql} LIMIT 1"),
            params,
        )
    ).mappings().first()
    return dict(row) if row else None


async def _fetch_edw_party_by_google_sub(db: AsyncSession, google_sub: str) -> Optional[dict]:
    return await _fetch_edw_party_where(db, "kv.val_short_code = :gsub", {"gsub": google_sub.strip()})


async def _link_google_sub_to_party(db: AsyncSession, party_id: str, google_sub: str) -> None:
    await _ensure_google_sub_reference_code(db)
    await db.execute(
        text(
            """
            INSERT INTO mdm_core.kv_entity_attribute (entity_uuid, attr_key_cd, val_short_code)
            VALUES (:pid, 9011, :gsub)
            ON CONFLICT (entity_uuid, attr_key_cd) DO UPDATE
            SET val_short_code = EXCLUDED.val_short_code, updated_ts = NOW()
            """
        ),
        {"pid": str(party_id), "gsub": google_sub.strip()[:64]},
    )
    await db.execute(
        text("UPDATE mdm_core.mdm_party SET kyc_verif_cd = 1021 WHERE party_id = :pid"),
        {"pid": str(party_id)},
    )


async def _fetch_edw_party_by_email(db: AsyncSession, email: str) -> Optional[dict]:
    return await _fetch_edw_party_where(db, "LOWER(c.email_addr) = :email", {"email": email.lower().strip()})


async def _fetch_edw_party_by_id(db: AsyncSession, party_id: str) -> Optional[dict]:
    try:
        UUID(str(party_id))
    except Exception:
        return None
    return await _fetch_edw_party_where(db, "p.party_id = :pid", {"pid": str(party_id)})


async def _create_edw_party(
    db: AsyncSession,
    email: str,
    full_name: str,
    phone: Optional[str] = None,
    password_hash: Optional[str] = None,
    role: UserRole = UserRole.DRIVER,
    kyc_verified: bool = False,
    google_sub: Optional[str] = None,
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

    if google_sub:
        await _link_google_sub_to_party(db, str(new_party_id), google_sub)

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
    vpa_fallback = f"{party['email_addr'].split('@')[0].replace('.', '')[:18]}@okaxis"
    balance = float(party.get("wallet_balance_inr") or 0.0)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        is_new_user=is_new,
        user_id=pid,
        full_name=party["full_name"],
        email=party["email_addr"],
        phone=party.get("phone_e164") or "",
        upi_id=party.get("upi_vpa_addr") or vpa_fallback,
        volt_credits_balance=balance,
        kyc_verified=(party.get("kyc_verif_cd") == 1021),
        active_role=role,
    )


def _party_to_user_response(party: dict) -> UserResponse:
    role = UserRole.HOST if party.get("party_type_cd") == 1002 else UserRole.DRIVER
    balance = Decimal(str(party.get("wallet_balance_inr") or "0.00"))
    return UserResponse(
        id=party["party_id"],
        full_name=party["full_name"],
        email=party["email_addr"],
        phone=party.get("phone_e164"),
        avatar_url=None,
        active_role=role,
        kyc_verified=(party.get("kyc_verif_cd") == 1021),
        trust_score=float(party.get("trust_score_num") or 5.0),
        volt_credits_balance=balance,
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
    existing = await _fetch_edw_party_by_email(db, email)

    if payload.purpose == "REGISTER" and existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in instead.",
        )

    if payload.purpose in ("LOGIN", "RESET") and not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please create an account first.",
        )

    if not await redis_service.check_login_allowed(f"otp_req:{email}", max_attempts=5):
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
        logger.warning(f"SMTP dispatch unavailable on host; OTP cached in Redis for {email}")

    is_dev_env = settings.APP_ENV.lower() in ("development", "dev", "test")
    return SendOtpResponse(
        success=True,
        message=f"A 6-digit verification code has been dispatched to {email}.",
        cooldown_seconds=30,
        otp_preview=otp if is_dev_env else None,
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
    if not await redis_service.check_login_allowed(f"pwd_login:{email}", max_attempts=8):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to too many failed attempts. Please wait 2 minutes or reset your password.",
        )

    party = await _fetch_edw_party_by_email(db, email)
    if not party:
        await redis_service.record_failed_login(f"pwd_login:{email}", window_seconds=120)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email address. Please sign up first.",
        )

    stored_hash = party.get("pwd_hash_argon2") or ""
    if not stored_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account was registered using Google or Email OTP. Please sign in with OTP or set a password via 'Forgot Password'.",
        )

    if not verify_password(payload.password, stored_hash):
        await redis_service.record_failed_login(f"pwd_login:{email}", window_seconds=120)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again or use 'Forgot Password'.",
        )

    await redis_service.clear_failed_logins(f"pwd_login:{email}")
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
    verified = verify_google_id_token(payload.id_token)
    google_sub = verified["sub"]
    email = verified["email"]
    name = verified["name"]

    # 1. Look up by immutable Google subject identifier (`sub`) first
    party_by_sub = await _fetch_edw_party_by_google_sub(db, google_sub)
    if party_by_sub:
        if party_by_sub.get("party_stat_cd") == 1012:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been disabled or suspended. Please contact VoltMate Support.",
            )
        return _party_to_token_response(party_by_sub, is_new=False)

    # 2. If not linked by `sub` yet, look up existing account by verified email and link safely
    existing = await _fetch_edw_party_by_email(db, email)
    if existing:
        if existing.get("party_stat_cd") == 1012:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been disabled or suspended. Please contact VoltMate Support.",
            )
        existing_sub = (existing.get("google_sub") or "").strip()
        if existing_sub and existing_sub != google_sub:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email address is already linked to a different Google account.",
            )
        await _link_google_sub_to_party(db, str(existing["party_id"]), google_sub)
        await db.commit()
        refreshed = await _fetch_edw_party_by_id(db, str(existing["party_id"]))
        return _party_to_token_response(refreshed or existing, is_new=False)

    # 3. Create new party keyed by Google `sub` and verified email
    created = await _create_edw_party(
        db=db,
        email=email,
        full_name=name or "VoltMate Driver",
        kyc_verified=True,
        google_sub=google_sub,
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


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    payload: dict,
    current_party: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_party:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    pid = str(current_party["party_id"])
    full_name = (payload.get("full_name") or "").strip()
    phone_number = (payload.get("phone_number") or payload.get("phone") or "").strip()
    upi_id = (payload.get("upi_id") or payload.get("upi_vpa") or "").strip()

    if full_name:
        await db.execute(
            text(
                """
                INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
                VALUES (:pid, 8001, 'EN', :fname)
                ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
                SET narrative_txt = EXCLUDED.narrative_txt
                """
            ),
            {"pid": pid, "fname": full_name[:100]},
        )

    if phone_number:
        clean_phone = phone_number.replace(" ", "").replace("-", "")[:20]
        await db.execute(
            text("UPDATE mdm_core.mdm_party_credential SET phone_e164 = :ph WHERE party_id = :pid"),
            {"ph": clean_phone, "pid": pid},
        )

    if upi_id:
        await db.execute(
            text("UPDATE mdm_core.mdm_party_credential SET upi_vpa_addr = :vpa WHERE party_id = :pid"),
            {"vpa": upi_id[:100], "pid": pid},
        )

    await db.commit()
    refreshed = await _fetch_edw_party_by_id(db, pid)
    return _party_to_user_response(refreshed or current_party)


@router.delete("/me")
async def delete_my_account(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    current_party: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-deletes and anonymizes the authenticated user's PII while preserving immutable
    financial facts in `dw_fact.fact_wallet_ledger`. Blocks deletion if an active charging
    session or unsettled booking hold is open.
    """
    if not current_party:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    pid = str(current_party["party_id"])

    active_session = await db.scalar(
        text(
            """
            SELECT 1
            FROM dw_fact.vw_resolved_sessions
            WHERE (driver_party_id = :pid OR host_party_id = :pid)
              AND session_stat_cd = 4002
            LIMIT 1
            """
        ),
        {"pid": pid},
    )
    if active_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete account while a live charging session is active. Please stop and settle the session first.",
        )

    open_hold = await db.scalar(
        text(
            """
            SELECT COALESCE(
                SUM(CASE WHEN l.txn_type_cd = 6005 THEN l.txn_amt_inr WHEN l.txn_type_cd = 6006 THEN -l.txn_amt_inr ELSE 0 END),
                0.00
            )
            FROM dw_fact.fact_wallet_ledger l
            JOIN dw_dim.dim_party_scd2 dp ON dp.party_sk = l.party_sk
            WHERE dp.party_id = :pid AND l.txn_type_cd IN (6005, 6006)
            """
        ),
        {"pid": pid},
    )
    if open_hold and Decimal(str(open_hold)) > Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete account while an upcoming booking hold is active. Please cancel or complete your reservation first.",
        )

    anon_email = f"deleted_{pid.replace('-', '')[:16]}@anonymized.voltmate.in"
    anon_phone = f"+910{random.randint(100000000, 999999999)}"

    await db.execute(
        text("UPDATE mdm_core.mdm_party SET party_stat_cd = 1012 WHERE party_id = :pid"),
        {"pid": pid},
    )
    await db.execute(
        text(
            """
            UPDATE mdm_core.mdm_party_credential
            SET email_addr = :aemail,
                phone_e164 = :aphone,
                pwd_hash_argon2 = NULL,
                upi_vpa_addr = NULL
            WHERE party_id = :pid
            """
        ),
        {"aemail": anon_email, "aphone": anon_phone, "pid": pid},
    )
    await db.execute(
        text("DELETE FROM mdm_core.kv_entity_attribute WHERE entity_uuid = :pid AND attr_key_cd = 9011"),
        {"pid": pid},
    )
    await db.execute(
        text(
            """
            UPDATE mdm_core.txt_entity_narrative
            SET narrative_txt = 'Deleted User'
            WHERE entity_uuid = :pid AND narrative_type_cd = 8001
            """
        ),
        {"pid": pid},
    )
    await db.commit()

    if credentials and credentials.credentials:
        decoded = decode_token(credentials.credentials)
        if decoded and decoded.get("jti"):
            await redis_service.revoke_token(
                decoded["jti"],
                ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )

    return {
        "deleted": True,
        "party_id": pid,
        "message": "Your account has been permanently closed and personal identifiers scrubbed.",
    }
