from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.user import UserRole

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
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    upi_id: Optional[str] = None

