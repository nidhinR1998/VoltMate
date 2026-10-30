from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.booking import BookingType, BookingStatus, PaymentMode

class BookingCreate(BaseModel):
    node_id: UUID
    vehicle_id: UUID
    scheduled_start: datetime
    scheduled_end: datetime
    booking_type: BookingType = BookingType.ADHOC
    estimated_kwh: float = Field(default=10.0, gt=0)
    payment_mode: PaymentMode = PaymentMode.UPI_DIRECT

class BookingRespond(BaseModel):
    accept: bool
    rejection_reason: Optional[str] = None

class VerifyGatePassRequest(BaseModel):
    gate_pass_code: str = Field(..., example="VM-5K9A2P")

class StartSessionRequest(BaseModel):
    pin_code: Optional[str] = Field(None, min_length=4, max_length=4)
    start_meter_reading: float = Field(..., ge=0, description="OCR extracted kWh or SOC percentage")
    start_meter_photo_url: Optional[str] = None

class CompleteSessionRequest(BaseModel):
    end_meter_reading: float = Field(..., ge=0, description="OCR extracted end kWh or SOC percentage")
    end_meter_photo_url: Optional[str] = None
    upi_utr_reference: Optional[str] = None

class RaiseDisputeRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)

class CancelBookingRequest(BaseModel):
    reason: Optional[str] = None

class StateTransitionAudit(BaseModel):
    from_state: str = Field(..., alias="from")
    to_state: str = Field(..., alias="to")
    event: str
    at: str
    actor_id: str
    actor_role: str
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True

class BookingResponse(BaseModel):
    id: UUID
    node_id: UUID
    driver_id: UUID
    host_id: UUID
    vehicle_id: UUID
    booking_type: BookingType
    scheduled_start: datetime
    scheduled_end: datetime
    checked_in_at: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: BookingStatus
    start_pin_code: str
    gate_pass_code: str
    gate_pass_verified: bool = False
    start_meter_reading: Optional[float] = None
    end_meter_reading: Optional[float] = None
    estimated_kwh: float
    actual_kwh: float
    energy_cost_inr: Decimal = Decimal("0.00")
    parking_cost_inr: Decimal = Decimal("0.00")
    overstay_minutes: int = 0
    overstay_penalty_inr: Decimal = Decimal("0.00")
    total_amount_inr: Decimal
    platform_fee_inr: Decimal
    payment_mode: PaymentMode
    upi_utr_reference: Optional[str] = None
    upi_intent_url: Optional[str] = None
    cancellation_reason: Optional[str] = None
    dispute_reason: Optional[str] = None
    state_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Extra display metadata
    node_title: Optional[str] = None
    host_name: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_reg: Optional[str] = None
    society_name: Optional[str] = None
    gate_instructions: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
