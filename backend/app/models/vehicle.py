import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Boolean, Float, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.db.session import Base

class VehicleCategory(str, enum.Enum):
    TWO_WHEELER = "2W"
    THREE_WHEELER = "3W"
    FOUR_WHEELER = "4W"

class ConnectorType(str, enum.Enum):
    SOCKET_15A = "SOCKET_15A"
    TYPE_2 = "TYPE_2"
    CCS2 = "CCS2"
    BHARAT_DC = "BHARAT_DC"
    BHARAT_AC = "BHARAT_AC"

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(Enum(VehicleCategory), default=VehicleCategory.FOUR_WHEELER, nullable=False)
    make = Column(String(80), nullable=False) # e.g. Tata, Ather, Ola, MG
    model = Column(String(80), nullable=False) # e.g. Nexon EV, 450X, ZS EV
    registration_number = Column(String(30), unique=True, index=True, nullable=False) # e.g. KL-07-XX-0000
    rc_verified = Column(Boolean, default=False, nullable=False)
    battery_capacity_kwh = Column(Float, nullable=False) # e.g. 40.5
    max_ac_power_kw = Column(Float, default=3.3, nullable=False) # e.g. 3.3 or 7.2
    connector_types = Column(ARRAY(String), nullable=False, default=list) # e.g. ["TYPE_2", "SOCKET_15A"]
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")

