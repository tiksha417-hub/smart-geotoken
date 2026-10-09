from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.db.session import get_db
from app.models.token import Token, TokenStatus, PriorityTier
from app.models.service import Service, Counter
from app.models.organization import ServiceLocation
from app.models.user import User
from app.schemas.token import (
    TokenCreate,
    TokenActivate,
    TokenOut,
    TokenVerifyQR,
    TokenCall,
    TokenComplete,
    TokenSkip
)
from app.api.deps import get_current_user, get_current_active_staff, get_optional_current_user
from app.services.queue_service import QueueService

router = APIRouter(prefix="/tokens", tags=["Tokens & Queue Management"])


def serialize_token_out(token: Token, db: Session) -> TokenOut:
    service = db.query(Service).filter(Service.id == token.service_id).first()
    location = db.query(ServiceLocation).filter(ServiceLocation.id == token.location_id).first()
    counter = db.query(Counter).filter(Counter.id == token.counter_id).first() if token.counter_id else None

    # Recalculate dynamic queue position if active
    if token.status == TokenStatus.ACTIVE:
        ahead = db.query(Token).filter(
            Token.service_id == token.service_id,
            Token.status == TokenStatus.ACTIVE,
            Token.activated_at < token.activated_at
        ).count()
        token.queue_position = ahead + 1
        if service:
            token.estimated_wait_minutes = token.queue_position * service.avg_duration_minutes

    out = TokenOut.model_validate(token)
    out.service_name = service.name if service else "Service"
    out.location_name = location.name if location else "Facility"
    out.counter_name = counter.name if counter else None
    return out


@router.post("", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def generate_token(
    token_in: TokenCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Step 1 of Workflow: Remotely books a service queue token.
    Token is initially stamped with status 'PENDING'.
    """
    token = await QueueService.create_token(
        db=db,
        token_in=token_in,
        customer_user_id=current_user.id if current_user else None
    )
    return serialize_token_out(token, db)


@router.post("/{token_identifier}/activate", response_model=TokenOut)
async def activate_token_geofence(
    token_identifier: str,
    activation_in: TokenActivate,
    db: Session = Depends(get_db)
):
    """
    Step 2 of Workflow: Real GPS verification.
    Customer sends current GPS coordinates. Server recalculates distance using
    Haversine formula. If within the facility geofence, transitions to 'ACTIVE'.
    """
    token, geo_result = await QueueService.activate_token_by_geofence(
        db=db,
        token_identifier=token_identifier,
        user_lat=activation_in.latitude,
        user_lng=activation_in.longitude
    )
    return serialize_token_out(token, db)


@router.get("/my/active", response_model=Optional[TokenOut])
def get_my_active_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the customer's current pending, active, or called token."""
    token = db.query(Token).filter(
        Token.customer_user_id == current_user.id,
        Token.status.in_([TokenStatus.PENDING, TokenStatus.ACTIVE, TokenStatus.CALLED, TokenStatus.VERIFIED])
    ).order_by(desc(Token.created_at)).first()

    if not token:
        return None
    return serialize_token_out(token, db)


@router.get("/my/history", response_model=List[TokenOut])
def get_my_token_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists past tokens issued to this customer."""
    tokens = db.query(Token).filter(
        Token.customer_user_id == current_user.id
    ).order_by(desc(Token.created_at)).limit(50).all()

    return [serialize_token_out(t, db) for t in tokens]


@router.get("/{token_identifier}", response_model=TokenOut)
def get_token_details(
    token_identifier: str,
    db: Session = Depends(get_db)
):
    """Fetches details for any token by ID or secure UUID."""
    token = db.query(Token).filter(
        or_(Token.token_uuid == token_identifier, Token.id == int(token_identifier) if token_identifier.isdigit() else False)
    ).first()

    if not token:
        raise HTTPException(status_code=404, detail="Token not found.")
    return serialize_token_out(token, db)


@router.post("/call-next", response_model=TokenOut)
async def call_next_token(
    call_in: TokenCall,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_active_staff)
):
    """
    Step 3 of Workflow: Counter operator calls the next eligible customer.
    Respects priority tiers and arrival time. Transitions token to 'CALLED'.
    """
    counter = db.query(Counter).filter(Counter.id == call_in.counter_id).first()
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found.")

    token = await QueueService.call_next_token(
        db=db,
        location_id=counter.location_id,
        counter_id=counter.id,
        service_id=call_in.service_id,
        staff_user_id=staff.id
    )
    return serialize_token_out(token, db)


@router.post("/{token_id}/verify-qr", response_model=TokenOut)
async def verify_token_qr(
    token_id: int,
    verify_in: TokenVerifyQR,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_active_staff)
):
    """
    Step 4 of Workflow: Staff scans customer's QR code.
    Backend verifies cryptographic secret and location match. Transitions to 'VERIFIED'.
    """
    token = await QueueService.verify_token_qr(
        db=db,
        token_id=token_id,
        qr_code_secret=verify_in.qr_code_secret,
        staff_user_id=staff.id
    )
    return serialize_token_out(token, db)


@router.post("/{token_id}/complete", response_model=TokenOut)
async def complete_token(
    token_id: int,
    complete_in: TokenComplete = TokenComplete(),
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_active_staff)
):
    """
    Step 5 of Workflow: Staff completes service delivery.
    Transitions to 'COMPLETED'.
    """
    token = await QueueService.complete_token(
        db=db,
        token_id=token_id,
        staff_user_id=staff.id,
        notes=complete_in.notes
    )
    return serialize_token_out(token, db)


@router.post("/{token_id}/cancel", response_model=TokenOut)
async def cancel_token(
    token_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """Cancels a pending or active token."""
    token = await QueueService.cancel_token(
        db=db,
        token_id=token_id,
        user_id=user.id if user else None,
        reason=reason
    )
    return serialize_token_out(token, db)


@router.post("/{token_id}/no-show-reallot")
async def no_show_and_reallot(
    token_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_active_staff)
):
    """
    Cancels an absent customer's token due to no-show and immediately allots the
    turn to the next customer physically present within the geofence perimeter.
    """
    cancelled_tkn, realloted_tkn = await QueueService.handle_no_show_reallot(
        db=db,
        token_id=token_id,
        staff_user_id=staff.id,
        reason=reason
    )
    return {
        "cancelled_token": serialize_token_out(cancelled_tkn, db),
        "realloted_token": serialize_token_out(realloted_tkn, db) if realloted_tkn else None,
        "message": f"Token {cancelled_tkn.token_number} cancelled. " + (
            f"Next token {realloted_tkn.token_number} called to desk." if realloted_tkn else "No other active customers waiting."
        )
    }


@router.get("/location/{location_id}/live-queue", response_model=List[TokenOut])
def get_live_location_queue(
    location_id: int,
    service_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieves all active, called, and pending queue tickets for staff monitor."""
    query = db.query(Token).filter(
        Token.location_id == location_id,
        Token.status.in_([TokenStatus.PENDING, TokenStatus.ACTIVE, TokenStatus.CALLED, TokenStatus.VERIFIED])
    )
    if service_id:
        query = query.filter(Token.service_id == service_id)

    tokens = query.order_by(Token.created_at.asc()).all()
    return [serialize_token_out(t, db) for t in tokens]
