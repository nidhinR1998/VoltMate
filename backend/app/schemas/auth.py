from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.models.user import UserRole
from app.core.validators import (
    validate_e164_phone,
    validate_otp_code,
    validate_password_complexity,
    sanitize_text,
)


class SendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(default="REGISTER", description="REGISTER | LOGIN | RESET")

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, v: str) -> str:
        clean = (v or "").upper().strip()
        if clean == "PASSWORD_RESET":
            clean = "RESET"
        if clean not in ("REGISTER", "LOGIN", "RESET"):
            raise ValueError("Purpose must be one of: REGISTER, LOGIN, RESET.")
        return clean


class SendOtpResponse(BaseModel):
    success: bool
    message: str
    cooldown_seconds: int = 60
    otp_preview: Optional[str] = None


class VerifyOtpRegisterRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., description="6-digit verification OTP")
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, description="Optional 10-digit Indian mobile or E.164 phone")
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    role: UserRole = UserRole.DRIVER

    @field_validator("otp")
    @classmethod
    def check_otp(cls, v: str) -> str:
        return validate_otp_code(v)

    @field_validator("full_name")
    @classmethod
    def check_name(cls, v: str) -> str:
        sanitized = sanitize_text(v, max_length=100, field_name="Full Name")
        if not sanitized or len(sanitized) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return sanitized

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_e164_phone(v)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_password_complexity(v)
        return v


class EmailPasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class EmailOtpLoginRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., description="6-digit verification code")

    @field_validator("otp")
    @classmethod
    def check_otp(cls, v: str) -> str:
        return validate_otp_code(v)


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., description="6-digit verification code")
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("otp")
    @classmethod
    def check_otp(cls, v: str) -> str:
        return validate_otp_code(v)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_complexity(v)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=20, description="Cryptographic Google ID token from Credential Manager")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new_user: bool = False
    user_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    volt_credits_balance: float = 0.0
    kyc_verified: bool = False
    active_role: UserRole


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
