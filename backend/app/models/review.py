import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import String
from sqlalchemy.orm import relationship
from app.db.session import Base

class ReviewAndKarma(Base):
    __tablename__ = "reviews_and_karma"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True, index=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("charging_nodes.id", ondelete="CASCADE"), nullable=True, index=True)
    
    rating = Column(Integer, nullable=False) # 1 to 5
    tags = Column(ARRAY(String), default=list, nullable=False) # ["Punctual", "Easy Gate Entry", "Fast Charging", "Clean Bay"]
    comment = Column(Text, nullable=True)
    karma_points_awarded = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="review")
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    target_user = relationship("User", back_populates="reviews_received", foreign_keys=[target_user_id])
    node = relationship("ChargingNode", back_populates="reviews")

