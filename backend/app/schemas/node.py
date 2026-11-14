from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.node import NodeType, NodeStatus
from app.models.vehicle import ConnectorType
from app.core.validators import (
    validate_latitude,
    validate_longitude,
    validate_energy_rate,
    validate_parking_fee,
    sanitize_text,
)


class NodeLocation(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

    @field_validator("latitude")
    @classmethod
    def check_lat(cls, v: float) -> float:
        return validate_latitude(v)

    @field_validator("longitude")
    @classmethod
    def check_lon(cls, v: float) -> float:
        return validate_longitude(v)


class ChargingNodeCreate(BaseModel):
    node_type: NodeType = NodeType.P2P_HOME
    title: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_line: str = Field(..., min_length=5, max_length=255)
    society_name: Optional[str] = Field(None, max_length=100)
    gate_instructions: Optional[str] = Field(None, max_length=500)
    connector_type: ConnectorType = ConnectorType.SOCKET_15A
    power_output_kw: float = Field(default=3.3, ge=1.0, le=350.0, description="Rated power output in kW")
    is_smart_iot: bool = False
    iot_device_id: Optional[str] = Field(None, max_length=100)
    price_per_kwh: Decimal = Field(default=Decimal("8.50"), description="Energy tariff in INR per kWh")
    parking_fee_per_hr: Decimal = Field(default=Decimal("15.00"), description="Parking fee in INR per hour")
    instant_book_enabled: bool = True
    min_driver_rating: float = Field(default=4.0, ge=1.0, le=5.0)
    amenities: List[str] = Field(default_factory=list)
    photos: List[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        san = sanitize_text(v, max_length=150, field_name="Title")
        if not san or len(san) < 3:
            raise ValueError("Title must be at least 3 characters.")
        return san

    @field_validator("description")
    @classmethod
    def check_desc(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=1000, field_name="Description") if v else None

    @field_validator("address_line")
    @classmethod
    def check_addr(cls, v: str) -> str:
        san = sanitize_text(v, max_length=255, field_name="Address")
        if not san or len(san) < 5:
            raise ValueError("Address must be at least 5 characters.")
        return san

    @field_validator("society_name")
    @classmethod
    def check_society(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=100, field_name="Society Name") if v else None

    @field_validator("gate_instructions")
    @classmethod
    def check_gate(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=500, field_name="Gate Instructions") if v else None

    @field_validator("latitude")
    @classmethod
    def check_lat(cls, v: float) -> float:
        return validate_latitude(v)

    @field_validator("longitude")
    @classmethod
    def check_lon(cls, v: float) -> float:
        return validate_longitude(v)

    @field_validator("price_per_kwh")
    @classmethod
    def check_rate(cls, v: Decimal) -> Decimal:
        return validate_energy_rate(v)

    @field_validator("parking_fee_per_hr")
    @classmethod
    def check_fee(cls, v: Decimal) -> Decimal:
        return validate_parking_fee(v)


class ChargingNodeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[NodeStatus] = None
    price_per_kwh: Optional[Decimal] = None
    parking_fee_per_hr: Optional[Decimal] = None
    instant_book_enabled: Optional[bool] = None
    gate_instructions: Optional[str] = Field(None, max_length=500)

    @field_validator("title")
    @classmethod
    def check_title(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=150, field_name="Title") if v else None

    @field_validator("price_per_kwh")
    @classmethod
    def check_rate(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        return validate_energy_rate(v) if v is not None else None

    @field_validator("parking_fee_per_hr")
    @classmethod
    def check_fee(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        return validate_parking_fee(v) if v is not None else None


class ChargingNodeResponse(BaseModel):
    id: UUID
    host_id: Optional[UUID] = None
    node_type: NodeType
    title: str
    description: Optional[str]
    latitude: float
    longitude: float
    address_line: str
    society_name: Optional[str]
    gate_instructions: Optional[str]
    connector_type: ConnectorType
    power_output_kw: float
    is_smart_iot: bool
    price_per_kwh: Decimal
    parking_fee_per_hr: Decimal
    instant_book_enabled: bool
    min_driver_rating: float
    status: NodeStatus
    amenities: List[str]
    photos: List[str]
    distance_km: Optional[float] = None
    host_name: Optional[str] = None
    host_trust_score: Optional[float] = None
    last_verified_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
