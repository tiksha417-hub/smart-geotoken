from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ServiceBase(BaseModel):
    name: str = Field(..., min_length=2)
    prefix_code: str = Field(..., min_length=1, max_length=5)
    description: Optional[str] = None
    avg_duration_minutes: int = Field(default=10, ge=1, le=120)
    max_daily_tokens: int = Field(default=500, ge=1)
    required_documents: str = "Government Photo ID"


class ServiceCreate(ServiceBase):
    location_id: int


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    prefix_code: Optional[str] = None
    description: Optional[str] = None
    avg_duration_minutes: Optional[int] = None
    max_daily_tokens: Optional[int] = None
    required_documents: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceOut(ServiceBase):
    id: int
    location_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CounterBase(BaseModel):
    name: str = Field(..., min_length=1)
    counter_number: int = Field(default=1, ge=1)


class CounterCreate(CounterBase):
    location_id: int
    staff_user_id: Optional[int] = None


class CounterUpdate(BaseModel):
    name: Optional[str] = None
    counter_number: Optional[int] = None
    staff_user_id: Optional[int] = None
    current_token_id: Optional[int] = None
    is_active: Optional[bool] = None


class CounterOut(CounterBase):
    id: int
    location_id: int
    staff_user_id: Optional[int] = None
    current_token_id: Optional[int] = None
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True
