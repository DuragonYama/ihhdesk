from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date as date_type, time, timedelta
from app.database import get_db
from app.models import User, ClockEvent
from app.schemas import ClockInRequest, ClockEventResponse, ClockEventUpdate
from app.dependencies import get_current_user, get_current_admin

router = APIRouter()

@router.post("/in", response_model=ClockEventResponse)
async def clock_in(
    clock_data: ClockInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clock in for today"""
    
    # Only employees can clock in
    if current_user.role != 'employee':
        raise HTTPException(status_code=403, detail="Only employees can clock in")
    
    today = datetime.now().date()
    
    existing = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id,
        ClockEvent.date == today
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in today")
    
    clock_event = ClockEvent(
        user_id=current_user.id,
        date=today,
        clock_in=datetime.now().time(),
        clock_out=time(18, 0, 0), # Default
        came_by_car=clock_data.came_by_car,
        parking_cost=clock_data.parking_cost,
        km_driven=clock_data.km_driven
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