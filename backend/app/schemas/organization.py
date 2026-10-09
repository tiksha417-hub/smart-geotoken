from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2)
    slug: str = Field(..., min_length=2)
    sector: str = "general"
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationOut(OrganizationBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LocationBase(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2)
    address: str = Field(..., min_length=5)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    geofence_radius_meters: float = Field(default=500.0, ge=10.0, le=50000.0)
    token_validity_minutes: int = Field(default=45, ge=5, le=1440)
    operating_hours: str = "Mon - Fri: 08:30 AM - 05:30 PM"
    contact_phone: str = "+1 (800) 555-0100"


class LocationCreate(LocationBase):
    organization_id: int


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius_meters: Optional[float] = None
    token_validity_minutes: Optional[int] = None
    operating_hours: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


class LocationOut(LocationBase):
    id: int
    organization_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
