from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.vehicle import VehicleCategory
from app.core.validators import validate_vehicle_plate, sanitize_text


class VehicleCreate(BaseModel):
    category: VehicleCategory = VehicleCategory.FOUR_WHEELER
    make: str = Field(..., min_length=2, max_length=50, example="Tata")
    model: str = Field(..., min_length=1, max_length=50, example="Nexon EV Max")
    registration_number: str = Field(..., min_length=5, max_length=20, example="KL-07-CD-4921")
    battery_capacity_kwh: float = Field(..., ge=1.0, le=250.0, example=40.5)
    max_ac_power_kw: float = Field(default=3.3, ge=1.0, le=44.0, example=3.3)
    connector_types: List[str] = Field(default_factory=lambda: ["TYPE_2", "SOCKET_15A"])
    is_primary: bool = True

    @field_validator("registration_number")
    @classmethod
    def check_plate(cls, v: str) -> str:
        return validate_vehicle_plate(v)

    @field_validator("make")
    @classmethod
    def check_make(cls, v: str) -> str:
        san = sanitize_text(v, max_length=50, field_name="Make")
        if not san or len(san) < 2:
            raise ValueError("Vehicle make must be at least 2 characters.")
        return san

    @field_validator("model")
    @classmethod
    def check_model(cls, v: str) -> str:
        san = sanitize_text(v, max_length=50, field_name="Model")
        if not san or len(san) < 1:
            raise ValueError("Vehicle model must be at least 1 character.")
        return san


class VehicleVerifyRC(BaseModel):
    registration_number: str = Field(..., min_length=5, max_length=20)
    ocr_extracted_text: str = Field(..., min_length=5, max_length=5000)
    confidence_score: float = Field(..., ge=0.0, le=1.0)

    @field_validator("registration_number")
    @classmethod
    def check_plate(cls, v: str) -> str:
        return validate_vehicle_plate(v)


class VehicleResponse(BaseModel):
    id: UUID
    user_id: UUID
    category: VehicleCategory
    make: str
    model: str
    registration_number: str
    rc_verified: bool
    battery_capacity_kwh: float
    max_ac_power_kw: float
    connector_types: List[str]
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True
