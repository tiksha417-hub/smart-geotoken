from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DeviceRegister(BaseModel):
    device_id: str = Field(..., min_length=3, max_length=100) # e.g. "ESP32-COUNTER-01"
    name: str = Field(..., min_length=2)
    location_id: int
    counter_id: Optional[int] = None
    firmware_version: str = "1.0.0"


class DeviceHeartbeat(BaseModel):
    device_id: str
    ip_address: Optional[str] = None
    firmware_version: Optional[str] = None


class DeviceAction(BaseModel):
    action: str = Field(..., description="NEXT, VERIFY, or RESET")


class DeviceOut(BaseModel):
    id: int
    device_id: str
    name: str
    location_id: int
    counter_id: Optional[int] = None
    is_active: bool
    is_online: bool
    last_heartbeat_at: Optional[datetime] = None
    ip_address: Optional[str] = None
    firmware_version: str
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceCommandOut(BaseModel):
    id: int
    command_type: str
    payload: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
