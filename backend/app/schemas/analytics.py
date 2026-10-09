from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class QueueSummary(BaseModel):
    location_id: int
    pending_count: int
    active_count: int
    called_count: int
    completed_today: int
    cancelled_today: int
    expired_today: int
    avg_wait_minutes: float


class PublicDisplayItem(BaseModel):
    token_number: str
    counter_name: str
    service_name: str
    called_at: Optional[str] = None
    priority: str


class UpcomingQueueItem(BaseModel):
    token_number: str
    service_name: str
    estimated_wait_minutes: int
    priority: str


class PublicDisplayOut(BaseModel):
    location_name: str
    organization_name: str
    current_time: str
    current_serving: List[PublicDisplayItem]
    upcoming_queue: List[UpcomingQueueItem]
    completed_today_count: int
