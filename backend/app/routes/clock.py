from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date as date_type, time, timedelta
from app.database import get_db
from app.models import User, ClockEvent, Absence
from app.schemas import ClockInRequest, ClockEventResponse, ClockEventUpdate
from app.dependencies import get_current_user, get_current_admin

router = APIRouter()

@router.post("/in", response_model=ClockEventResponse)
async def clock_in(
    clock_data: ClockInRequest,
    clock_date: date_type = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clock in (employees can backdate within current week, admin anytime)"""
    
    if current_user.role != 'employee':
        raise HTTPException(status_code=403, detail="Only employees can clock in")
    
    # Default to today if no date specified
    if clock_date is None:
        clock_date = datetime.now().date()
    
    # Check if employee is trying to clock in outside current week
    if current_user.role == 'employee':
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        if clock_date < week_start or clock_date > week_end:
            raise HTTPException(
                status_code=403,
                detail=f"Employees can only clock in for current week ({week_start} to {week_end})"
            )
    
    # AUTO-CLOSE OPEN ABSENCES (NEW!)
    open_absence = db.query(Absence).filter(
        Absence.user_id == current_user.id,
        Absence.end_date == None,
        Absence.status == 'approved'
    ).first()
    
    if open_absence and open_absence.start_date < clock_date:
        # Close the absence - they're back!
        open_absence.end_date = clock_date - timedelta(days=1)
        db.commit()
    
    # Check if already clocked in for this date
    existing = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id,
        ClockEvent.date == clock_date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Already clocked in for {clock_date}"
        )
    
    # Create clock event
    clock_event = ClockEvent(
        user_id=current_user.id,
        date=clock_date,
        clock_in=datetime.now().time(),
        clock_out=time(18, 0, 0),
        came_by_car=clock_data.came_by_car,
        parking_cost=clock_data.parking_cost,
        km_driven=clock_data.km_driven
    )
    
    db.add(clock_event)
    db.commit()
    db.refresh(clock_event)
    
    return clock_event

@router.post("/create", response_model=ClockEventResponse)
async def create_clock_event(
    user_id: int,
    event_date: date_type,
    clock_in_time: time,
    clock_out_time: time,
    came_by_car: bool = False,
    parking_cost: Optional[float] = None,
    km_driven: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create clock event for any user/date (admin only)"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != 'employee':
        raise HTTPException(status_code=400, detail="Can only create clock events for employees")
    
    # Check if already exists
    existing = db.query(ClockEvent).filter(
        ClockEvent.user_id == user_id,
        ClockEvent.date == event_date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Clock event already exists for {user.username} on {event_date}"
        )
    
    clock_event = ClockEvent(
        user_id=user_id,
        date=event_date,
        clock_in=clock_in_time,
        clock_out=clock_out_time,
        came_by_car=came_by_car,
        parking_cost=parking_cost,
        km_driven=km_driven,
        created_at=datetime.now(),
        modified_by=current_user.id
    )
    
    db.add(clock_event)
    db.commit()
    db.refresh(clock_event)
    
    return clock_event

@router.get("/my-events", response_model=List[ClockEventResponse])
async def get_my_clock_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get my clock events history"""
    
    events = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id
    ).order_by(ClockEvent.date.desc()).all()
    
    return events

@router.get("/today", response_model=List[dict])
async def get_today_active(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get who's active today"""
    
    today = datetime.now().date()
    
    # Get today's clock events with user info
    clock_events = db.query(ClockEvent, User).join(
        User, ClockEvent.user_id == User.id
    ).filter(
        ClockEvent.date == today
    ).all()
    
    result = []
    for event, user in clock_events:
        result.append({
            "username": user.username,
            "clock_in": event.clock_in,
            "clock_out": event.clock_out
        })
    
    return result

@router.get("/user/{user_id}/events", response_model=List[ClockEventResponse])
async def get_user_clock_events(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get clock events for a specific user (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    events = db.query(ClockEvent).filter(
        ClockEvent.user_id == user_id
    ).order_by(ClockEvent.date.desc()).all()
    
    return events

@router.patch("/{event_id}", response_model=ClockEventResponse)
async def update_clock_event(
    event_id: int,
    update_data: ClockEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update clock event"""
    
    event = db.query(ClockEvent).filter(ClockEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Clock event not found")
    
    # Check permissions
    # Admin can edit any event
    # Employee can only edit their own events from current week
    if current_user.role == 'admin':
        can_edit = True
    elif event.user_id == current_user.id:
        # Check if within current week (Monday to Sunday)
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())  # Monday
        week_end = week_start + timedelta(days=6)  # Sunday
        can_edit = week_start <= event.date <= week_end
    else:
        can_edit = False
    
    if not can_edit:
        raise HTTPException(
            status_code=403,
            detail="Cannot edit this clock event (outside current week or not your event)"
        )
    
    # Update fields
    if update_data.clock_in is not None:
        event.clock_in = update_data.clock_in
    if update_data.clock_out is not None:
        event.clock_out = update_data.clock_out
    if update_data.came_by_car is not None:
        event.came_by_car = update_data.came_by_car
    if update_data.parking_cost is not None:
        event.parking_cost = update_data.parking_cost
    if update_data.km_driven is not None:
        event.km_driven = update_data.km_driven
    
    event.modified_at = datetime.now()
    event.modified_by = current_user.id
    
    db.commit()
    db.refresh(event)
    
    return event