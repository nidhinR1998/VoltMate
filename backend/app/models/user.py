import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Boolean, Float, Numeric, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class UserRole(str, enum.Enum):
    DRIVER = "DRIVER"
    HOST = "HOST"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    google_sub_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    active_role = Column(Enum(UserRole), default=UserRole.DRIVER, nullable=False)
    kyc_verified = Column(Boolean, default=False, nullable=False)
    trust_score = Column(Float, default=5.0, nullable=False)
    volt_credits_balance = Column(Numeric(10, 2), default=100.00, nullable=False) # Welcome 100 bonus credits
    upi_id = Column(String(100), nullable=True) # e.g. host@okaxis
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    hosted_nodes = relationship("ChargingNode", back_populates="host", foreign_keys="ChargingNode.host_id")
    driver_bookings = relationship("Booking", back_populates="driver", foreign_keys="Booking.driver_id")
    host_bookings = relationship("Booking", back_populates="host", foreign_keys="Booking.host_id")
    reviews_given = relationship("ReviewAndKarma", back_populates="reviewer", foreign_keys="ReviewAndKarma.reviewer_id")
    reviews_received = relationship("ReviewAndKarma", back_populates="target_user", foreign_keys="ReviewAndKarma.target_user_id")

