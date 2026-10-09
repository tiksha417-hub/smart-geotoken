from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.service import Counter
from app.models.organization import ServiceLocation
from app.models.user import User
from app.schemas.service import CounterCreate, CounterUpdate, CounterOut
from app.api.deps import get_current_active_admin, get_current_active_staff

router = APIRouter(prefix="/counters", tags=["Counters & Desks"])


@router.get("/location/{location_id}", response_model=List[CounterOut])
def list_location_counters(location_id: int, db: Session = Depends(get_db)):
    counters = db.query(Counter).filter(
        Counter.location_id == location_id,
        Counter.is_active == True
    ).order_by(Counter.counter_number.asc()).all()
    return [CounterOut.model_validate(c) for c in counters]


@router.post("", response_model=CounterOut, status_code=status.HTTP_201_CREATED)
def create_counter(
    counter_in: CounterCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    loc = db.query(ServiceLocation).filter(ServiceLocation.id == counter_in.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Target location not found.")

    new_counter = Counter(
        location_id=counter_in.location_id,
        name=counter_in.name.strip(),
        counter_number=counter_in.counter_number,
        staff_user_id=counter_in.staff_user_id
    )
    db.add(new_counter)
    db.commit()
    db.refresh(new_counter)
    return CounterOut.model_validate(new_counter)


@router.put("/{counter_id}", response_model=CounterOut)
def update_counter(
    counter_id: int,
    counter_in: CounterUpdate,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_active_staff)
):
    ctr = db.query(Counter).filter(Counter.id == counter_id).first()
    if not ctr:
        raise HTTPException(status_code=404, detail="Counter not found.")

    update_data = counter_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(ctr, field, val)

    db.commit()
    db.refresh(ctr)
    return CounterOut.model_validate(ctr)
