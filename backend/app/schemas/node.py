from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.node import NodeType, NodeStatus
from app.models.vehicle import ConnectorType

class NodeLocation(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class ChargingNodeCreate(BaseModel):
    node_type: NodeType = NodeType.P2P_HOME
    title: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    latitude: float
    longitude: float
    address_line: str
    society_name: Optional[str] = None
    gate_instructions: Optional[str] = None
    connector_type: ConnectorType = ConnectorType.SOCKET_15A
    power_output_kw: float = 3.3
    is_smart_iot: bool = False
    iot_device_id: Optional[str] = None
    price_per_kwh: Decimal = Decimal("8.50")
    parking_fee_per_hr: Decimal = Decimal("15.00")
    instant_book_enabled: bool = True
    min_driver_rating: float = 4.0
    amenities: List[str] = Field(default_factory=list)
    photos: List[str] = Field(default_factory=list)

class ChargingNodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[NodeStatus] = None
    price_per_kwh: Optional[Decimal] = None
    parking_fee_per_hr: Optional[Decimal] = None
    instant_book_enabled: Optional[bool] = None
    gate_instructions: Optional[str] = None

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

