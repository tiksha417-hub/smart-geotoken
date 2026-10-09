import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc
from fastapi import HTTPException, status

from app.models.token import Token, TokenStatus, PriorityTier, TokenEvent
from app.models.service import Service, Counter
from app.models.organization import ServiceLocation
from app.models.notification import Notification
from app.schemas.token import TokenCreate
from app.core.security import generate_secure_qr_code_secret
from app.core.geofence import evaluate_server_geofence, calculate_haversine_distance
from app.websocket.connection_manager import manager
from app.core.config import settings


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class QueueService:

    @staticmethod
    def generate_token_number(db: Session, service: Service, location: ServiceLocation) -> str:
        """
        Generates the next sequential token number for the given service today.
        e.g., 'D-101', 'D-102'.
        """
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        count = db.query(func.count(Token.id)).filter(
            Token.service_id == service.id,
            Token.created_at >= today_start
        ).scalar() or 0

        next_seq = count + 101
        return f"{service.prefix_code}-{next_seq}"

    @classmethod
    async def create_token(
        cls,
        db: Session,
        token_in: TokenCreate,
        customer_user_id: Optional[int] = None
    ) -> Token:
        location = db.query(ServiceLocation).filter(
            ServiceLocation.id == token_in.location_id,
            ServiceLocation.is_active == True
        ).first()

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service location not found or inactive."
            )

        service = db.query(Service).filter(
            Service.id == token_in.service_id,
            Service.location_id == location.id,
            Service.is_active == True
        ).first()

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected service is not offered at this location or is inactive."
            )

        # Prevent duplicate active/pending tokens for the same customer phone in the same service today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing = db.query(Token).filter(
            Token.service_id == service.id,
            Token.customer_phone == token_in.customer_phone,
            Token.status.in_([TokenStatus.PENDING, TokenStatus.ACTIVE, TokenStatus.CALLED]),
            Token.created_at >= today_start
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already hold an active/pending token ({existing.token_number}) for this service."
            )

        token_number = cls.generate_token_number(db, service, location)
        token_uuid = str(uuid.uuid4())
        secure_qr_secret = generate_secure_qr_code_secret()

        now = datetime.now(timezone.utc)
        validity_minutes = location.token_validity_minutes or 45
        expires_deadline = now + timedelta(minutes=validity_minutes)

        # Calculate estimated wait based on eligible tokens ahead
        active_ahead = db.query(func.count(Token.id)).filter(
            Token.service_id == service.id,
            Token.status.in_([TokenStatus.ACTIVE, TokenStatus.CALLED])
        ).scalar() or 0

        estimated_wait = (active_ahead + 1) * service.avg_duration_minutes

        new_token = Token(
            token_number=token_number,
            token_uuid=token_uuid,
            secure_qr_secret=secure_qr_secret,
            organization_id=location.organization_id,
            location_id=location.id,
            service_id=service.id,
            customer_user_id=customer_user_id,
            customer_name=token_in.customer_name.strip(),
            customer_phone=token_in.customer_phone.strip(),
            customer_email=token_in.customer_email.strip() if token_in.customer_email else None,
            purpose_notes=token_in.purpose_notes.strip() if token_in.purpose_notes else None,
            priority=token_in.priority,
            status=TokenStatus.PENDING,
            queue_position=active_ahead + 1,
            estimated_wait_minutes=estimated_wait,
            created_at=now,
            expires_at_deadline=expires_deadline
        )

        db.add(new_token)
        db.flush()

        # Audit Event
        event = TokenEvent(
            token_id=new_token.id,
            event_type="GENERATED",
            from_status=None,
            to_status=TokenStatus.PENDING.value,
            triggered_by_user_id=customer_user_id,
            notes=f"Remote token booked. Validity: {validity_minutes} mins."
        )
        db.add(event)

        # Customer in-app notification
        if customer_user_id:
            notif = Notification(
                user_id=customer_user_id,
                token_id=new_token.id,
                title="Token Booked Remotely",
                message=f"Your token {token_number} is PENDING. Enter the {location.name} geofence to activate.",
                type="INFO"
            )
            db.add(notif)

        db.commit()
        db.refresh(new_token)

        # Broadcast update
        await manager.broadcast_location_update(
            location.id,
            "TOKEN_CREATED",
            {"token_number": token_number, "service_id": service.id}
        )

        return new_token

    @classmethod
    async def activate_token_by_geofence(
        cls,
        db: Session,
        token_identifier: str,
        user_lat: float,
        user_lng: float
    ) -> Tuple[Token, dict]:
        """
        Activates a PENDING token when verified within the facility's geofence perimeter.
        """
        # Find token by UUID or ID
        token = db.query(Token).filter(
            or_(Token.token_uuid == token_identifier, Token.id == int(token_identifier) if token_identifier.isdigit() else False)
        ).first()

        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

        # Check state machine
        if token.status != TokenStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token is already in status '{token.status.value}'. Only PENDING tokens can be activated."
            )

        now = datetime.now(timezone.utc)
        deadline = ensure_utc(token.expires_at_deadline)
        if deadline and now > deadline:
            token.status = TokenStatus.EXPIRED
            token.expired_at = now
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token has expired. Please book a new token."
            )

        location = db.query(ServiceLocation).filter(ServiceLocation.id == token.location_id).first()
        if not location:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility location missing.")

        # Real Geofence Evaluation on Backend
        geo_result = evaluate_server_geofence(
            user_lat=user_lat,
            user_lon=user_lng,
            facility_lat=location.latitude,
            facility_lon=location.longitude,
            radius_meters=location.geofence_radius_meters
        )

        if not geo_result["is_within"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Outside geofence: You are {geo_result['distance_meters']:.1f}m away. Must be within {location.geofence_radius_meters:.0f}m to activate.",
                    "distance_meters": geo_result["distance_meters"],
                    "required_radius": location.geofence_radius_meters,
                    "status": geo_result["status"]
                }
            )

        # Passed geofence check -> Transition to ACTIVE
        token.status = TokenStatus.ACTIVE
        token.activated_at = now
        token.activation_distance_meters = geo_result["distance_meters"]
        token.activation_lat = user_lat
        token.activation_lng = user_lng
        token.verification_hash = f"GEO-STAMP-{uuid.uuid4().hex[:8].upper()}"

        event = TokenEvent(
            token_id=token.id,
            event_type="ACTIVATED",
            from_status=TokenStatus.PENDING.value,
            to_status=TokenStatus.ACTIVE.value,
            triggered_by_user_id=token.customer_user_id,
            notes=f"Physical geofence verified at distance {geo_result['distance_meters']:.1f}m."
        )
        db.add(event)

        if token.customer_user_id:
            notif = Notification(
                user_id=token.customer_user_id,
                token_id=token.id,
                title="Token Activated",
                message=f"Welcome! Your token {token.token_number} is now ACTIVE in queue.",
                type="SUCCESS"
            )
            db.add(notif)

        db.commit()
        db.refresh(token)

        # Notify via WebSockets
        await manager.broadcast_location_update(
            location.id,
            "TOKEN_ACTIVATED",
            {"token_number": token.token_number, "token_id": token.id}
        )
        await manager.send_token_update(
            token.token_uuid,
            "STATUS_CHANGED",
            {"status": TokenStatus.ACTIVE.value, "token_number": token.token_number}
        )

        return token, geo_result

    @classmethod
    async def call_next_token(
        cls,
        db: Session,
        location_id: int,
        counter_id: int,
        service_id: Optional[int] = None,
        staff_user_id: Optional[int] = None
    ) -> Token:
        counter = db.query(Counter).filter(
            Counter.id == counter_id,
            Counter.location_id == location_id
        ).first()

        if not counter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Counter not found at this location.")

        query = db.query(Token).filter(
            Token.location_id == location_id,
            Token.status == TokenStatus.ACTIVE
        )

        if service_id:
            query = query.filter(Token.service_id == service_id)

        # Priority-Aware Ordering:
        # Priority tiers rank: VIP (4) > SENIOR_DISABLED (3) > APPOINTMENT (2) > STANDARD (1)
        # Then activated_at ASC
        tokens_list = query.all()
        if not tokens_list:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active tokens waiting in queue.")

        def priority_rank(p: PriorityTier) -> int:
            if p == PriorityTier.VIP_PRIORITY:
                return 4
            if p == PriorityTier.SENIOR_DISABLED:
                return 3
            if p == PriorityTier.APPOINTMENT:
                return 2
            return 1

        tokens_list.sort(key=lambda t: (-priority_rank(t.priority), t.activated_at or t.created_at))
        next_token = tokens_list[0]

        now = datetime.now(timezone.utc)
        next_token.status = TokenStatus.CALLED
        next_token.called_at = now
        next_token.counter_id = counter.id
        counter.current_token_id = next_token.id

        event = TokenEvent(
            token_id=next_token.id,
            event_type="CALLED",
            from_status=TokenStatus.ACTIVE.value,
            to_status=TokenStatus.CALLED.value,
            triggered_by_user_id=staff_user_id,
            notes=f"Summoned to {counter.name}."
        )
        db.add(event)

        if next_token.customer_user_id:
            notif = Notification(
                user_id=next_token.customer_user_id,
                token_id=next_token.id,
                title="Your Turn!",
                message=f"Token {next_token.token_number}: Please proceed to {counter.name}.",
                type="CALL"
            )
            db.add(notif)

        db.commit()
        db.refresh(next_token)

        # Broadcast call to all channels (location, TV display board, personal token pass)
        call_payload = {
            "token_number": next_token.token_number,
            "token_id": next_token.id,
            "counter_name": counter.name,
            "service_id": next_token.service_id
        }
        await manager.broadcast_location_update(location_id, "TOKEN_CALLED", call_payload)
        await manager.send_token_update(next_token.token_uuid, "TOKEN_CALLED", call_payload)

        return next_token

    @classmethod
    async def verify_token_qr(
        cls,
        db: Session,
        token_id: int,
        qr_code_secret: str,
        staff_user_id: int
    ) -> Token:
        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

        if token.status != TokenStatus.CALLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token status is '{token.status.value}'. Must be CALLED to verify."
            )

        if token.secure_qr_secret != qr_code_secret.strip():
            # Log failed attempt
            event = TokenEvent(
                token_id=token.id,
                event_type="VERIFY_FAILED",
                from_status=token.status.value,
                to_status=token.status.value,
                triggered_by_user_id=staff_user_id,
                notes="QR verification failed: Invalid cryptographic secret."
            )
            db.add(event)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR Code verification failed: Invalid secret or token mismatch."
            )

        now = datetime.now(timezone.utc)
        token.status = TokenStatus.VERIFIED
        token.verified_at = now

        event = TokenEvent(
            token_id=token.id,
            event_type="VERIFIED",
            from_status=TokenStatus.CALLED.value,
            to_status=TokenStatus.VERIFIED.value,
            triggered_by_user_id=staff_user_id,
            notes="QR Code verified at service counter."
        )
        db.add(event)
        db.commit()
        db.refresh(token)

        await manager.broadcast_location_update(
            token.location_id,
            "TOKEN_VERIFIED",
            {"token_number": token.token_number, "token_id": token.id}
        )
        await manager.send_token_update(
            token.token_uuid,
            "STATUS_CHANGED",
            {"status": TokenStatus.VERIFIED.value, "token_number": token.token_number}
        )

        return token

    @classmethod
    async def complete_token(
        cls,
        db: Session,
        token_id: int,
        staff_user_id: int,
        notes: Optional[str] = None
    ) -> Token:
        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

        if token.status not in [TokenStatus.VERIFIED, TokenStatus.CALLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token cannot be completed from status '{token.status.value}'."
            )

        now = datetime.now(timezone.utc)
        prev_status = token.status.value
        token.status = TokenStatus.COMPLETED
        token.completed_at = now

        # Clear counter current token if assigned
        if token.counter_id:
            counter = db.query(Counter).filter(Counter.id == token.counter_id).first()
            if counter and counter.current_token_id == token.id:
                counter.current_token_id = None

        event = TokenEvent(
            token_id=token.id,
            event_type="COMPLETED",
            from_status=prev_status,
            to_status=TokenStatus.COMPLETED.value,
            triggered_by_user_id=staff_user_id,
            notes=notes or "Service transaction successfully completed."
        )
        db.add(event)
        db.commit()
        db.refresh(token)

        await manager.broadcast_location_update(
            token.location_id,
            "TOKEN_COMPLETED",
            {"token_number": token.token_number, "token_id": token.id}
        )
        await manager.send_token_update(
            token.token_uuid,
            "STATUS_CHANGED",
            {"status": TokenStatus.COMPLETED.value, "token_number": token.token_number}
        )

        return token

    @classmethod
    async def cancel_token(
        cls,
        db: Session,
        token_id: int,
        user_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> Token:
        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

        if token.status in [TokenStatus.COMPLETED, TokenStatus.CANCELLED, TokenStatus.EXPIRED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token is already in terminal state '{token.status.value}'."
            )

        now = datetime.now(timezone.utc)
        prev_status = token.status.value
        token.status = TokenStatus.CANCELLED
        token.cancelled_at = now

        if token.counter_id:
            counter = db.query(Counter).filter(Counter.id == token.counter_id).first()
            if counter and counter.current_token_id == token.id:
                counter.current_token_id = None

        event = TokenEvent(
            token_id=token.id,
            event_type="CANCELLED",
            from_status=prev_status,
            to_status=TokenStatus.CANCELLED.value,
            triggered_by_user_id=user_id,
            notes=reason or "Token cancelled by user."
        )
        db.add(event)
        db.commit()
        db.refresh(token)

        await manager.broadcast_location_update(
            token.location_id,
            "TOKEN_CANCELLED",
            {"token_number": token.token_number, "token_id": token.id}
        )
        await manager.send_token_update(
            token.token_uuid,
            "STATUS_CHANGED",
            {"status": TokenStatus.CANCELLED.value, "token_number": token.token_number}
        )

        return token

    @classmethod
    async def handle_no_show_reallot(
        cls,
        db: Session,
        token_id: int,
        staff_user_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> Tuple[Token, Optional[Token]]:
        """
        Cancels an allotted token because the customer was not available/absent,
        and immediately allots the turn to the next person present inside the geofence (ACTIVE).
        """
        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

        if token.status not in [TokenStatus.CALLED, TokenStatus.ACTIVE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token in status '{token.status.value}' cannot be marked as absent/no-show."
            )

        now = datetime.now(timezone.utc)
        counter_id = token.counter_id
        location_id = token.location_id
        service_id = token.service_id
        prev_status = token.status.value

        # 1. Cancel the no-show token
        token.status = TokenStatus.CANCELLED
        token.cancelled_at = now
        cancel_reason = reason or "Customer not available at allotted time (No-Show). Turn reallocated."

        if token.counter_id:
            counter = db.query(Counter).filter(Counter.id == token.counter_id).first()
            if counter and counter.current_token_id == token.id:
                counter.current_token_id = None

        event = TokenEvent(
            token_id=token.id,
            event_type="NO_SHOW_CANCELLED",
            from_status=prev_status,
            to_status=TokenStatus.CANCELLED.value,
            triggered_by_user_id=staff_user_id,
            notes=cancel_reason
        )
        db.add(event)

        if token.customer_user_id:
            notif = Notification(
                user_id=token.customer_user_id,
                token_id=token.id,
                title="Token Cancelled (No-Show)",
                message=f"Your token {token.token_number} was cancelled because you were not available when called.",
                type="ALERT"
            )
            db.add(notif)

        db.commit()
        db.refresh(token)

        await manager.broadcast_location_update(
            location_id,
            "TOKEN_CANCELLED_NO_SHOW",
            {"token_number": token.token_number, "token_id": token.id, "reason": cancel_reason}
        )
        await manager.send_token_update(
            token.token_uuid,
            "STATUS_CHANGED",
            {"status": TokenStatus.CANCELLED.value, "token_number": token.token_number, "reason": cancel_reason}
        )

        # 2. Automatically allot turn to next person present (ACTIVE)
        next_alloted_token: Optional[Token] = None
        if counter_id:
            try:
                next_alloted_token = await cls.call_next_token(
                    db=db,
                    location_id=location_id,
                    counter_id=counter_id,
                    service_id=service_id,
                    staff_user_id=staff_user_id
                )
            except HTTPException:
                # No other active tokens waiting in queue at this moment
                next_alloted_token = None

        return token, next_alloted_token

    @classmethod
    async def expire_stale_tokens(cls, db: Session) -> int:
        """
        Background task: Finds PENDING or ACTIVE tokens past expiration deadline
        and marks them EXPIRED. Also auto-cancels CALLED tokens exceeding no-show grace period
        and re-allots the turn to the next person present.
        """
        now = datetime.now(timezone.utc)
        count = 0

        # Expire stale pending/active tokens past deadline
        all_candidates = db.query(Token).filter(
            Token.status.in_([TokenStatus.PENDING, TokenStatus.ACTIVE])
        ).all()

        for t in all_candidates:
            deadline = ensure_utc(t.expires_at_deadline)
            if deadline and deadline <= now:
                prev = t.status.value
                t.status = TokenStatus.EXPIRED
                t.expired_at = now
                event = TokenEvent(
                    token_id=t.id,
                    event_type="EXPIRED",
                    from_status=prev,
                    to_status=TokenStatus.EXPIRED.value,
                    notes="Automatically expired due to timeout."
                )
                db.add(event)
                count += 1

        if count > 0:
            db.commit()

        # Check CALLED tokens past no-show window
        called_tokens = db.query(Token).filter(Token.status == TokenStatus.CALLED).all()
        for c in called_tokens:
            called_time = ensure_utc(c.called_at)
            if called_time:
                diff_minutes = (now - called_time).total_seconds() / 60.0
                if diff_minutes >= settings.CALLED_TOKEN_NO_SHOW_TIMEOUT_MINUTES:
                    try:
                        await cls.handle_no_show_reallot(
                            db=db,
                            token_id=c.id,
                            reason=f"Auto-cancelled: exceeded {settings.CALLED_TOKEN_NO_SHOW_TIMEOUT_MINUTES} min arrival window."
                        )
                        count += 1
                    except Exception:
                        pass

        return count
