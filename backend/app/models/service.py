from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    prefix_code = Column(String(10), nullable=False) # e.g., 'D', 'C', 'P', 'R'
    description = Column(Text, nullable=True)
    avg_duration_minutes = Column(Integer, default=10, nullable=False)
    max_daily_tokens = Column(Integer, default=500, nullable=False)
    required_documents = Column(Text, default="Government Issued Photo ID", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    location = relationship("ServiceLocation", back_populates="services")
    tokens = relationship("Token", back_populates="service")


class Counter(Base):
    __tablename__ = "counters"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False) # e.g. "Window 1", "Desk A", "Room 101"
    counter_number = Column(Integer, default=1, nullable=False)
    staff_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    current_token_id = Column(Integer, ForeignKey("tokens.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    location = relationship("ServiceLocation", back_populates="counters")
    assigned_staff = relationship("User", foreign_keys=[staff_user_id])
    current_token = relationship("Token", foreign_keys=[current_token_id], post_update=True)
    devices = relationship("Device", back_populates="counter")
