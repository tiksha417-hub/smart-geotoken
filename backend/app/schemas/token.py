from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.token import TokenStatus, PriorityTier


class TokenCreate(BaseModel):
    location_id: int
    service_id: int
    customer_name: str = Field(..., min_length=2)
    customer_phone: str = Field(..., min_length=7)
    customer_email: Optional[str] = None
    purpose_notes: Optional[str] = None
    priority: PriorityTier = PriorityTier.STANDARD


class TokenActivate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy_meters: Optional[float] = None


class TokenVerifyQR(BaseModel):
    qr_code_secret: str = Field(..., min_length=5)


class TokenCall(BaseModel):
    counter_id: int
    service_id: Optional[int] = None


class TokenSkip(BaseModel):
    reason: str = Field(..., min_length=3)


class TokenComplete(BaseModel):
    notes: Optional[str] = None


class TokenEventOut(BaseModel):
    id: int
    token_id: int
    event_type: str
    from_status: Optional[str] = None
    to_status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    id: int
    token_number: str
    token_uuid: str
    secure_qr_secret: str
    organization_id: int
    location_id: int
    service_id: int
    counter_id: Optional[int] = None

    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    purpose_notes: Optional[str] = None

    priority: PriorityTier
    status: TokenStatus

    queue_position: int
    estimated_wait_minutes: int

    created_at: datetime
    activated_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None
    expires_at_deadline: datetime

    activation_distance_meters: Optional[float] = None
    activation_lat: Optional[float] = None
    activation_lng: Optional[float] = None
    verification_hash: Optional[str] = None

    # Computed fields for presentation
    service_name: Optional[str] = None
    location_name: Optional[str] = None
    counter_name: Optional[str] = None

    class Config:
        from_attributes = True
