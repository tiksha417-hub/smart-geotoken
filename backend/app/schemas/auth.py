from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: Optional[UserRole] = UserRole.CUSTOMER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
