from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.vehicle import VehicleCategory

class VehicleCreate(BaseModel):
    category: VehicleCategory
    make: str = Field(..., example="Tata")
    model: str = Field(..., example="Nexon EV Max")
    registration_number: str = Field(..., example="KL-07-CD-4921")
    battery_capacity_kwh: float = Field(..., gt=0, example=40.5)
    max_ac_power_kw: float = Field(default=3.3, gt=0, example=3.3)
    connector_types: List[str] = Field(default_factory=lambda: ["TYPE_2", "SOCKET_15A"])
    is_primary: bool = True

class VehicleVerifyRC(BaseModel):
    registration_number: str
    ocr_extracted_text: str
    confidence_score: float

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

