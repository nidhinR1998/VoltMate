import uuid
from sqlalchemy import Column, Integer, Time, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class HostAvailabilitySlot(Base):
    __tablename__ = "host_availability_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("charging_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False) # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False) # e.g. 09:00:00
    end_time = Column(Time, nullable=False) # e.g. 18:00:00
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship
    node = relationship("ChargingNode", back_populates="availability_slots")

