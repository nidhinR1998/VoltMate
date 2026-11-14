from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.user import UserRole
from app.core.validators import validate_e164_phone, validate_upi_vpa, sanitize_text


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    active_role: UserRole
    kyc_verified: bool
    trust_score: float
    volt_credits_balance: Decimal
    upi_id: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class UserRoleSwitchRequest(BaseModel):
    new_role: UserRole


class UserUpdateProfile(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    avatar_url: Optional[str] = Field(None, max_length=1000)
    upi_id: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def check_name(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=100, field_name="Full Name") if v else None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_e164_phone(v)

    @field_validator("upi_id")
    @classmethod
    def check_upi(cls, v: Optional[str]) -> Optional[str]:
        return validate_upi_vpa(v)
