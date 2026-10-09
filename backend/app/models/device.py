from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. "ESP32-COUNTER-01"
    api_key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="CASCADE"), nullable=False)
    counter_id = Column(Integer, ForeignKey("counters.id", ondelete="SET NULL"), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    is_online = Column(Boolean, default=False, nullable=False)
    last_heartbeat_at = Column(DateTime, nullable=True)
    ip_address = Column(String(50), nullable=True)
    firmware_version = Column(String(50), default="1.0.0", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    location = relationship("ServiceLocation", back_populates="devices")
    counter = relationship("Counter", back_populates="devices")
    commands = relationship("DeviceCommand", back_populates="device", cascade="all, delete-orphan")


class DeviceCommand(Base):
    __tablename__ = "device_commands"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    command_type = Column(String(50), nullable=False) # NEXT_TOKEN, DISPLAY_TEXT, BUZZER_BEEP, RESET_DISPLAY
    payload = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, DELIVERED, EXECUTED, FAILED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    executed_at = Column(DateTime, nullable=True)

    # Relationships
    device = relationship("Device", back_populates="commands")
