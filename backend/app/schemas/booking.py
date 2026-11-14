from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.booking import BookingType, BookingStatus, PaymentMode
from app.core.validators import sanitize_text


class BookingCreate(BaseModel):
    node_id: UUID
    vehicle_id: UUID
    scheduled_start: datetime
    scheduled_end: datetime
    booking_type: BookingType = BookingType.ADHOC
    estimated_kwh: float = Field(default=10.0, ge=0.5, le=250.0, description="Estimated energy delivery in kWh")
    payment_mode: PaymentMode = PaymentMode.UPI_DIRECT

    @model_validator(mode="after")
    def check_time_window(self):
        if self.scheduled_end <= self.scheduled_start:
            raise ValueError("Scheduled end time must be strictly after scheduled start time.")
        duration_minutes = (self.scheduled_end - self.scheduled_start).total_seconds() / 60
        if duration_minutes < 15:
            raise ValueError("Charging slot reservation must be at least 15 minutes.")
        if duration_minutes > 1440:  # 24 hours
            raise ValueError("Charging slot reservation cannot exceed 24 hours.")
        return self


class BookingRespond(BaseModel):
    accept: bool
    rejection_reason: Optional[str] = Field(None, max_length=300)

    @field_validator("rejection_reason")
    @classmethod
    def check_reason(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=300, field_name="Rejection Reason") if v else None


class VerifyGatePassRequest(BaseModel):
    gate_pass_code: str = Field(..., min_length=4, max_length=20, example="VM-5K9A2P")

    @field_validator("gate_pass_code")
    @classmethod
    def check_code(cls, v: str) -> str:
        clean = (v or "").strip().upper()
        if len(clean) < 4:
            raise ValueError("Gate pass code must be at least 4 characters.")
        return clean


class StartSessionRequest(BaseModel):
    pin_code: Optional[str] = Field(None, min_length=4, max_length=6, description="4-digit start PIN")
    start_meter_reading: float = Field(..., ge=0.0, le=100000.0, description="OCR extracted kWh or SOC percentage")
    start_meter_photo_url: Optional[str] = Field(None, max_length=1000)

    @field_validator("pin_code")
    @classmethod
    def check_pin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if not clean.isdigit():
                raise ValueError("Start PIN code must contain only numeric digits.")
            return clean
        return None


class CompleteSessionRequest(BaseModel):
    end_meter_reading: float = Field(..., ge=0.0, le=100000.0, description="OCR extracted end kWh or SOC percentage")
    end_meter_photo_url: Optional[str] = Field(None, max_length=1000)
    upi_utr_reference: Optional[str] = Field(None, min_length=8, max_length=64, description="Bank UPI 12-digit UTR reference")

    @field_validator("upi_utr_reference")
    @classmethod
    def check_utr(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return sanitize_text(v.strip().upper(), max_length=64, field_name="UPI UTR Reference")
        return None


class RaiseDisputeRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)

    @field_validator("reason")
    @classmethod
    def check_reason(cls, v: str) -> str:
        san = sanitize_text(v, max_length=500, field_name="Dispute Reason")
        if not san or len(san) < 5:
            raise ValueError("Dispute reason must be at least 5 characters.")
        return san


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=300)

    @field_validator("reason")
    @classmethod
    def check_reason(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=300, field_name="Cancellation Reason") if v else None


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
