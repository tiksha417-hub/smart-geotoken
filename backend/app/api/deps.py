from typing import List, Optional
from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.device import Device

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account.")

    return user


async def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_token(auth.credentials)
        if not payload or "sub" not in payload:
            return None
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user and user.is_active:
            return user
    except Exception:
        return None
    return None


def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires role in {[r.value for r in allowed_roles]}."
            )
        return current_user
    return role_checker


async def get_current_active_admin(
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
) -> User:
    return current_user


async def get_current_active_staff(
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN]))
) -> User:
    return current_user


async def get_authenticated_device(
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    db: Session = Depends(get_db)
) -> Device:
    """Authenticates physical IoT ESP32 devices via custom API credentials."""
    if not x_device_id or not x_device_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Device-Id or X-Device-Key headers."
        )

    device = db.query(Device).filter(
        Device.device_id == x_device_id,
        Device.api_key == x_device_key,
        Device.is_active == True
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized hardware device credentials."
        )

    return device
