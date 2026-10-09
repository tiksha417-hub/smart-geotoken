from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.service import Service
from app.models.organization import ServiceLocation
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceOut
from app.api.deps import get_current_active_admin

router = APIRouter(prefix="/services", tags=["Services & Departments"])


@router.get("/location/{location_id}", response_model=List[ServiceOut])
def list_location_services(location_id: int, db: Session = Depends(get_db)):
    services = db.query(Service).filter(
        Service.location_id == location_id,
        Service.is_active == True
    ).all()
    return [ServiceOut.model_validate(s) for s in services]


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    service_in: ServiceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    loc = db.query(ServiceLocation).filter(ServiceLocation.id == service_in.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Target location not found.")

    new_service = Service(
        location_id=service_in.location_id,
        name=service_in.name.strip(),
        prefix_code=service_in.prefix_code.strip().upper(),
        description=service_in.description,
        avg_duration_minutes=service_in.avg_duration_minutes,
        max_daily_tokens=service_in.max_daily_tokens,
        required_documents=service_in.required_documents
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return ServiceOut.model_validate(new_service)


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    service_in: ServiceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service not found.")

    update_data = service_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(srv, field, val)

    db.commit()
    db.refresh(srv)
    return ServiceOut.model_validate(srv)
