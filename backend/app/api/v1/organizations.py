from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.organization import Organization, ServiceLocation
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationOut,
    LocationCreate,
    LocationUpdate,
    LocationOut
)
from app.api.deps import get_current_active_admin

router = APIRouter(prefix="/organizations", tags=["Organizations & Locations"])


@router.get("", response_model=List[OrganizationOut])
def list_organizations(
    sector: Optional[str] = Query(None, description="Filter by sector: healthcare, government, telecom, education, retail, general"),
    db: Session = Depends(get_db)
):
    query = db.query(Organization).filter(Organization.is_active == True)
    if sector and sector != "all":
        query = query.filter(Organization.sector == sector)
    return [OrganizationOut.model_validate(o) for o in query.all()]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    existing = db.query(Organization).filter(Organization.name == org_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organization with this name already exists.")

    new_org = Organization(
        name=org_in.name.strip(),
        slug=org_in.slug.strip().lower(),
        sector=org_in.sector,
        description=org_in.description
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return OrganizationOut.model_validate(new_org)


@router.get("/locations", response_model=List[LocationOut])
def list_all_locations(db: Session = Depends(get_db)):
    locations = db.query(ServiceLocation).filter(ServiceLocation.is_active == True).all()
    return [LocationOut.model_validate(loc) for loc in locations]


@router.get("/{org_id}/locations", response_model=List[LocationOut])
def list_org_locations(org_id: int, db: Session = Depends(get_db)):
    locations = db.query(ServiceLocation).filter(
        ServiceLocation.organization_id == org_id,
        ServiceLocation.is_active == True
    ).all()
    return [LocationOut.model_validate(loc) for loc in locations]


@router.get("/locations/{location_id}", response_model=LocationOut)
def get_location(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(ServiceLocation).filter(ServiceLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Service location not found.")
    return LocationOut.model_validate(loc)


@router.post("/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(
    loc_in: LocationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    org = db.query(Organization).filter(Organization.id == loc_in.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Parent organization not found.")

    new_loc = ServiceLocation(
        organization_id=loc_in.organization_id,
        name=loc_in.name.strip(),
        code=loc_in.code.strip().upper(),
        address=loc_in.address.strip(),
        latitude=loc_in.latitude,
        longitude=loc_in.longitude,
        geofence_radius_meters=loc_in.geofence_radius_meters,
        token_validity_minutes=loc_in.token_validity_minutes,
        operating_hours=loc_in.operating_hours,
        contact_phone=loc_in.contact_phone
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return LocationOut.model_validate(new_loc)


@router.put("/locations/{location_id}/geofence", response_model=LocationOut)
def update_geofence_configuration(
    location_id: int,
    radius_meters: float = Query(..., ge=10.0, le=50000.0),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    validity_minutes: Optional[int] = Query(None, ge=5, le=1440),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    loc = db.query(ServiceLocation).filter(ServiceLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Service location not found.")

    loc.geofence_radius_meters = radius_meters
    if latitude is not None:
        loc.latitude = latitude
    if longitude is not None:
        loc.longitude = longitude
    if validity_minutes is not None:
        loc.token_validity_minutes = validity_minutes

    db.commit()
    db.refresh(loc)
    return LocationOut.model_validate(loc)
