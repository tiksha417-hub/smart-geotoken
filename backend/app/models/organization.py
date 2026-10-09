from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    sector = Column(String(100), default="general", nullable=False) # healthcare, government, telecom, education, retail, general
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    locations = relationship("ServiceLocation", back_populates="organization", cascade="all, delete-orphan")


class ServiceLocation(Base):
    __tablename__ = "service_locations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geofence_radius_meters = Column(Float, default=500.0, nullable=False)
    token_validity_minutes = Column(Integer, default=45, nullable=False)
    operating_hours = Column(String(255), default="Mon - Fri: 08:30 AM - 05:30 PM", nullable=False)
    contact_phone = Column(String(50), default="+1 (800) 555-0100", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="locations")
    services = relationship("Service", back_populates="location", cascade="all, delete-orphan")
    counters = relationship("Counter", back_populates="location", cascade="all, delete-orphan")
    tokens = relationship("Token", back_populates="location")
    devices = relationship("Device", back_populates="location")
    hours_schedule = relationship("OperatingHours", back_populates="location", cascade="all, delete-orphan")


class OperatingHours(Base):
    __tablename__ = "operating_hours"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False) # 0 = Monday, 6 = Sunday
    open_time = Column(String(10), default="08:30", nullable=False)
    close_time = Column(String(10), default="17:30", nullable=False)
    is_closed = Column(Boolean, default=False, nullable=False)

    # Relationships
    location = relationship("ServiceLocation", back_populates="hours_schedule")
