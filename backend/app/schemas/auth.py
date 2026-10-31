from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole


class SendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(default="REGISTER", description="REGISTER | LOGIN | RESET")


class SendOtpResponse(BaseModel):
    success: bool
    message: str
    cooldown_seconds: int = 60
    otp_preview: Optional[str] = None


class VerifyOtpRegisterRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    password: Optional[str] = Field(None, min_length=4, max_length=128)
    role: UserRole = UserRole.DRIVER


class EmailPasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class EmailOtpLoginRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=10)
    access_token: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None
    client_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new_user: bool = False
    user_id: str
    full_name: str
    email: str
    active_role: UserRole


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
