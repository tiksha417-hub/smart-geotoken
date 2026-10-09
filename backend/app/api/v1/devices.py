import secrets
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.device import Device, DeviceCommand
from app.models.service import Counter
from app.models.user import User
from app.schemas.device import DeviceRegister, DeviceHeartbeat, DeviceOut
from app.api.deps import get_current_active_admin, get_authenticated_device
from app.services.queue_service import QueueService

router = APIRouter(prefix="/devices", tags=["ESP32 Hardware IoT"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_device(
    device_in: DeviceRegister,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """Admin registers an ESP32 hardware counter unit and gets a secure API Key."""
    existing = db.query(Device).filter(Device.device_id == device_in.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already registered.")

    raw_api_key = f"esp32_{secrets.token_urlsafe(24)}"

    device = Device(
        device_id=device_in.device_id.strip(),
        api_key=raw_api_key,
        name=device_in.name.strip(),
        location_id=device_in.location_id,
        counter_id=device_in.counter_id,
        firmware_version=device_in.firmware_version,
        is_active=True,
        is_online=False
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    return {
        "message": "ESP32 Device registered successfully.",
        "device_id": device.device_id,
        "api_key": raw_api_key,
        "instructions": "Flash this device_id and api_key into your esp32_token_device.ino firmware."
    }


@router.post("/heartbeat")
def device_heartbeat(
    heartbeat_in: DeviceHeartbeat,
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    """ESP32 sends periodic heartbeat over Wi-Fi."""
    device.is_online = True
    device.last_heartbeat_at = datetime.now(timezone.utc)
    if heartbeat_in.ip_address:
        device.ip_address = heartbeat_in.ip_address
    if heartbeat_in.firmware_version:
        device.firmware_version = heartbeat_in.firmware_version

    db.commit()
    return {"status": "OK", "server_time": datetime.now(timezone.utc).isoformat()}


@router.post("/next-token")
async def device_call_next(
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    """
    Physical Hardware Trigger: Operator pressed NEXT button on the ESP32.
    The server calls the next eligible token and formats the 16x2 LCD display strings.
    """
    if not device.counter_id:
        raise HTTPException(
            status_code=400,
            detail="This ESP32 device is not assigned to a specific counter in the admin settings."
        )

    counter = db.query(Counter).filter(Counter.id == device.counter_id).first()
    if not counter:
        raise HTTPException(status_code=404, detail="Assigned counter not found.")

    try:
        token = await QueueService.call_next_token(
            db=db,
            location_id=device.location_id,
            counter_id=device.counter_id,
            staff_user_id=counter.staff_user_id
        )

        return {
            "success": True,
            "token_number": token.token_number,
            "counter_name": counter.name,
            # Formatted for standard 16x2 LCD display lines:
            "lcd_line1": f"NOW: {token.token_number}".ljust(16)[:16],
            "lcd_line2": f"CTR: {counter.name}".ljust(16)[:16],
            "beep_count": 2,
            "beep_duration_ms": 200
        }
    except HTTPException as e:
        return {
            "success": False,
            "detail": e.detail,
            "lcd_line1": "QUEUE EMPTY     ",
            "lcd_line2": f"{counter.name}".ljust(16)[:16],
            "beep_count": 1,
            "beep_duration_ms": 500
        }


@router.post("/verify-action")
def device_verify_action(
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    """
    Physical Hardware Trigger: Operator pressed VERIFY button on the ESP32.
    Directs the operator to scan the customer's QR on the staff web portal.
    """
    counter = db.query(Counter).filter(Counter.id == device.counter_id).first() if device.counter_id else None
    return {
        "success": True,
        "action": "SCAN_REQUIRED",
        "message": "Please scan customer QR code via the staff web terminal.",
        "lcd_line1": "SCAN QR ON WEB  ",
        "lcd_line2": (counter.name if counter else "READY").ljust(16)[:16],
        "beep_count": 1,
        "beep_duration_ms": 150
    }


@router.get("/location/{location_id}", response_model=List[DeviceOut])
def list_location_devices(
    location_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """Admin overview of all ESP32 devices at a location with live online status."""
    devices = db.query(Device).filter(Device.location_id == location_id).all()
    # Mark offline if last heartbeat > 90 seconds ago
    now = datetime.now(timezone.utc)
    for d in devices:
        if d.last_heartbeat_at:
            delta = (now - d.last_heartbeat_at.replace(tzinfo=timezone.utc)).total_seconds()
            if delta > 90:
                d.is_online = False
        else:
            d.is_online = False

    return [DeviceOut.model_validate(d) for d in devices]
