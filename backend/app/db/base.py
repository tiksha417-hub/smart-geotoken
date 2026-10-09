# Import all models here so that Base.metadata has all entities registered
from app.db.session import Base
from app.models import (
    User,
    UserRole,
    Organization,
    ServiceLocation,
    OperatingHours,
    Service,
    Counter,
    Token,
    TokenStatus,
    PriorityTier,
    TokenEvent,
    Device,
    DeviceCommand,
    Notification
)

__all__ = ["Base"]
