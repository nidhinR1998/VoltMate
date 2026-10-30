import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Boolean, Float, Numeric, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.vehicle import ConnectorType

try:
    from geoalchemy2 import Geography
except ImportError:
    # Graceful fallback for environments where geoalchemy2 is not installed
    def Geography(*args, **kwargs):
        return Text

class NodeType(str, enum.Enum):
    P2P_HOME = "P2P_HOME"
    P2P_RWA = "P2P_RWA"
    DESTINATION_CAFE = "DESTINATION_CAFE"
    PUBLIC_DC = "PUBLIC_DC"

class NodeStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"

class ChargingNode(Base):
    __tablename__ = "charging_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    node_type = Column(Enum(NodeType), default=NodeType.P2P_HOME, nullable=False, index=True)
    title = Column(String(150), nullable=False) # e.g. "Kakkanad Green Villa 15A Socket"
    description = Column(Text, nullable=True)
    
    # PostGIS 4326 point geography: longitude, latitude
    location = Column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)
    
    address_line = Column(String(255), nullable=False)
    society_name = Column(String(120), nullable=True) # e.g. "Prestige Hillside Gateway"
    gate_instructions = Column(Text, nullable=True) # e.g. "Inform security at Gate 2: Visiting Flat 504 Tower B"
    connector_type = Column(Enum(ConnectorType), default=ConnectorType.SOCKET_15A, nullable=False)
    power_output_kw = Column(Float, default=3.3, nullable=False) # 3.3, 7.4, 22, 60
    
    # Smart Relay / OCPP hardware toggle
    is_smart_iot = Column(Boolean, default=False, nullable=False)
    iot_device_id = Column(String(100), nullable=True) # e.g. "tasmota_relay_kseb_01"
    
    # Pricing
    price_per_kwh = Column(Numeric(6, 2), default=8.50, nullable=False)
    parking_fee_per_hr = Column(Numeric(6, 2), default=15.00, nullable=False)
    instant_book_enabled = Column(Boolean, default=True, nullable=False)
    min_driver_rating = Column(Float, default=4.0, nullable=False)
    
    status = Column(Enum(NodeStatus), default=NodeStatus.AVAILABLE, nullable=False, index=True)
    amenities = Column(ARRAY(String), default=list, nullable=False)
    photos = Column(ARRAY(String), default=list, nullable=False)
    last_verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    host = relationship("User", back_populates="hosted_nodes", foreign_keys=[host_id])
    availability_slots = relationship("HostAvailabilitySlot", back_populates="node", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="node")
    reviews = relationship("ReviewAndKarma", back_populates="node")
