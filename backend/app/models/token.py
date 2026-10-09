from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.db.session import Base


class TokenStatus(str, enum.Enum):
    PENDING = "PENDING"       # Initial remote booking; awaiting geofence entry
    ACTIVE = "ACTIVE"         # Validated inside geofence; queued to be called
    CALLED = "CALLED"         # Counter operator called the token
    VERIFIED = "VERIFIED"     # Staff scanned and authenticated QR code
    COMPLETED = "COMPLETED"   # Service finished
    CANCELLED = "CANCELLED"   # Cancelled by customer or staff
    EXPIRED = "EXPIRED"       # Expired due to timeout


class PriorityTier(str, enum.Enum):
    STANDARD = "standard"
    SENIOR_DISABLED = "senior_disabled"
    APPOINTMENT = "appointment"
    VIP_PRIORITY = "vip_priority"


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(50), nullable=False, index=True) # e.g. "D-101", "C-204"
    token_uuid = Column(String(100), unique=True, index=True, nullable=False)
    secure_qr_secret = Column(String(100), unique=True, index=True, nullable=False)

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    counter_id = Column(Integer, ForeignKey("counters.id", ondelete="SET NULL"), nullable=True, index=True)

    customer_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=True)
    purpose_notes = Column(Text, nullable=True)

    priority = Column(Enum(PriorityTier), default=PriorityTier.STANDARD, nullable=False, index=True)
    status = Column(Enum(TokenStatus), default=TokenStatus.PENDING, nullable=False, index=True)

    queue_position = Column(Integer, default=0, nullable=False)
    estimated_wait_minutes = Column(Integer, default=5, nullable=False)

    # Lifecycle Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    activated_at = Column(DateTime, nullable=True)
    called_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    expired_at = Column(DateTime, nullable=True)
    expires_at_deadline = Column(DateTime, nullable=False, index=True)

    # Geofence Stamp on Activation
    activation_distance_meters = Column(Float, nullable=True)
    activation_lat = Column(Float, nullable=True)
    activation_lng = Column(Float, nullable=True)
    verification_hash = Column(String(100), nullable=True)

    # Relationships
    location = relationship("ServiceLocation", back_populates="tokens")
    service = relationship("Service", back_populates="tokens")
    customer = relationship("User", back_populates="tokens", foreign_keys=[customer_user_id])
    assigned_counter = relationship("Counter", foreign_keys=[counter_id])
    events = relationship("TokenEvent", back_populates="token", cascade="all, delete-orphan", order_by="TokenEvent.created_at")

    __table_args__ = (
        Index("ix_tokens_location_status", "location_id", "status"),
        Index("ix_tokens_service_status", "service_id", "status"),
    )


class TokenEvent(Base):
    __tablename__ = "token_events"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # GENERATED, ACTIVATED, CALLED, RECALLED, VERIFIED, COMPLETED, CANCELLED, EXPIRED
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    triggered_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    device_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    token = relationship("Token", back_populates="events")
    triggered_by = relationship("User", foreign_keys=[triggered_by_user_id])
