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

class VerifyOtpRegisterRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+91[6-9]\d{9}$")
    password: Optional[str] = Field(None, min_length=6)
    role: UserRole = UserRole.DRIVER

class EmailPasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str

class EmailOtpLoginRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class GoogleAuthRequest(BaseModel):
    id_token: str

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
    refresh_token: str

