from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.token import Token, TokenStatus
from app.models.organization import ServiceLocation
from app.models.service import Service, Counter
from app.schemas.analytics import QueueSummary, PublicDisplayOut, PublicDisplayItem, UpcomingQueueItem

router = APIRouter(prefix="/analytics", tags=["Analytics & Public Displays"])


@router.get("/location/{location_id}/summary", response_model=QueueSummary)
def get_location_queue_summary(location_id: int, db: Session = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    pending_cnt = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.PENDING
    ).scalar() or 0

    active_cnt = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.ACTIVE
    ).scalar() or 0

    called_cnt = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status.in_([TokenStatus.CALLED, TokenStatus.VERIFIED])
    ).scalar() or 0

    completed_today = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.COMPLETED,
        Token.completed_at >= today_start
    ).scalar() or 0

    cancelled_today = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.CANCELLED,
        Token.cancelled_at >= today_start
    ).scalar() or 0

    expired_today = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.EXPIRED,
        Token.expired_at >= today_start
    ).scalar() or 0

    avg_wait = db.query(func.avg(Token.estimated_wait_minutes)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.ACTIVE
    ).scalar() or 6.0

    return QueueSummary(
        location_id=location_id,
        pending_count=pending_cnt,
        active_count=active_cnt,
        called_count=called_cnt,
        completed_today=completed_today,
        cancelled_today=cancelled_today,
        expired_today=expired_today,
        avg_wait_minutes=round(float(avg_wait), 1)
    )


@router.get("/location/{location_id}/public-display", response_model=PublicDisplayOut)
def get_public_display_data(location_id: int, db: Session = Depends(get_db)):
    """
    Public TV Screen endpoint:
    Displays now serving and upcoming tokens. Does NOT leak customer PII, phone, or private QR codes!
    """
    loc = db.query(ServiceLocation).filter(ServiceLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Service location not found.")

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Currently called or in-service
    called_tokens = db.query(Token).filter(
        Token.location_id == location_id,
        Token.status.in_([TokenStatus.CALLED, TokenStatus.VERIFIED])
    ).order_by(Token.called_at.desc()).limit(8).all()

    serving_items: List[PublicDisplayItem] = []
    for t in called_tokens:
        srv = db.query(Service).filter(Service.id == t.service_id).first()
        ctr = db.query(Counter).filter(Counter.id == t.counter_id).first() if t.counter_id else None
        serving_items.append(
            PublicDisplayItem(
                token_number=t.token_number,
                counter_name=ctr.name if ctr else "Desk",
                service_name=srv.name if srv else "Service",
                called_at=t.called_at.strftime("%I:%M %p") if t.called_at else None,
                priority=t.priority.value
            )
        )

    # Upcoming active tokens in line
    upcoming_tokens = db.query(Token).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.ACTIVE
    ).order_by(Token.activated_at.asc()).limit(8).all()

    upcoming_items: List[UpcomingQueueItem] = []
    for t in upcoming_tokens:
        srv = db.query(Service).filter(Service.id == t.service_id).first()
        upcoming_items.append(
            UpcomingQueueItem(
                token_number=t.token_number,
                service_name=srv.name if srv else "Service",
                estimated_wait_minutes=t.estimated_wait_minutes,
                priority=t.priority.value
            )
        )

    completed_cnt = db.query(func.count(Token.id)).filter(
        Token.location_id == location_id,
        Token.status == TokenStatus.COMPLETED,
        Token.completed_at >= today_start
    ).scalar() or 0

    now_str = datetime.now(timezone.utc).strftime("%I:%M:%S %p")

    return PublicDisplayOut(
        location_name=loc.name,
        organization_name=loc.organization.name if loc.organization else "GeoToken Pavilion",
        current_time=now_str,
        current_serving=serving_items,
        upcoming_queue=upcoming_items,
        completed_today_count=completed_cnt
    )
