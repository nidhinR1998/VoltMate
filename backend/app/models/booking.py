import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Float, Numeric, DateTime, Enum, ForeignKey, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base

class BookingType(str, enum.Enum):
    ADHOC = "ADHOC"
    RECURRING = "RECURRING"

class BookingStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    ACTIVE_CHARGING = "ACTIVE_CHARGING"
    PAUSED = "PAUSED"
    METER_VERIFYING = "METER_VERIFYING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"
    EXPIRED = "EXPIRED"

class PaymentMode(str, enum.Enum):
    UPI_DIRECT = "UPI_DIRECT"
    VOLT_CREDITS = "VOLT_CREDITS"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("charging_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    host_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    booking_type = Column(Enum(BookingType), default=BookingType.ADHOC, nullable=False)
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(Enum(BookingStatus), default=BookingStatus.REQUESTED, nullable=False, index=True)
    
    # Handshake credentials
    start_pin_code = Column(String(4), nullable=False) # e.g. "4921"
    gate_pass_code = Column(String(10), nullable=False) # e.g. "VM-5K9A2P"
    gate_pass_verified = Column(Boolean, default=False, nullable=False)
    
    # Smart Meter OCR Telemetry
    start_meter_reading = Column(Float, nullable=True) # kWh or initial SOC%
    end_meter_reading = Column(Float, nullable=True) # kWh or final SOC%
    start_meter_photo_url = Column(String(500), nullable=True)
    end_meter_photo_url = Column(String(500), nullable=True)
    meter_ocr_confidence = Column(Float, default=1.0, nullable=False)
    
    # Energy Delivered
    estimated_kwh = Column(Float, default=0.0, nullable=False)
    actual_kwh = Column(Float, default=0.0, nullable=False)
    
    # Financial Settlement (0% Platform Fee for Community Mode)
    energy_cost_inr = Column(Numeric(8, 2), default=0.00, nullable=False)
    parking_cost_inr = Column(Numeric(8, 2), default=0.00, nullable=False)
    overstay_minutes = Column(Integer, default=0, nullable=False)
    overstay_penalty_inr = Column(Numeric(8, 2), default=0.00, nullable=False)
    total_amount_inr = Column(Numeric(8, 2), default=0.00, nullable=False)
    platform_fee_inr = Column(Numeric(8, 2), default=0.00, nullable=False)
    
    payment_mode = Column(Enum(PaymentMode), default=PaymentMode.UPI_DIRECT, nullable=False)
    upi_utr_reference = Column(String(50), nullable=True)
    host_upi_id = Column(String(100), nullable=True)
    
    # Rejection, cancellation, or dispute info
    cancellation_reason = Column(Text, nullable=True)
    dispute_reason = Column(Text, nullable=True)
    dispute_status = Column(String(50), nullable=True) # "OPEN", "RESOLVED"
    
    # Audit trail of state transitions
    state_history = Column(JSONB, default=list, nullable=False) # [{ "from": ..., "to": ..., "at": ..., "by": ..., "reason": ... }]
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    node = relationship("ChargingNode", back_populates="bookings")
    driver = relationship("User", back_populates="driver_bookings", foreign_keys=[driver_id])
    host = relationship("User", back_populates="host_bookings", foreign_keys=[host_id])
    vehicle = relationship("Vehicle", back_populates="bookings")
    review = relationship("ReviewAndKarma", back_populates="booking", uselist=False)
