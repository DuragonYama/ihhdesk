from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date as date_type, time, timedelta
from app.database import get_db
from app.models import User, ClockEvent, Absence, WorkSchedule
from app.schemas import ClockInRequest, ClockEventResponse, ClockEventUpdate, CreateClockEventRequest
from app.dependencies import get_current_user, get_current_admin

router = APIRouter()

def clock_event_to_dict(event: ClockEvent) -> dict:
    """Convert ClockEvent to dict with properly formatted times (no microseconds)"""
    return {
        "id": event.id,
        "user_id": event.user_id,
        "date": str(event.date),
        "clock_in": event.clock_in.strftime('%H:%M:%S') if event.clock_in else None,
        "clock_out": event.clock_out.strftime('%H:%M:%S') if event.clock_out else None,
        "came_by_car": event.came_by_car,
        "parking_cost": float(event.parking_cost) if event.parking_cost else None,
        "km_driven": float(event.km_driven) if event.km_driven else None,
        "status": event.status if hasattr(event, 'status') else 'approved',
        "requested_reason": event.requested_reason if hasattr(event, 'requested_reason') else None
    }

@router.post("/")
async def create_clock_event(
    event_data: CreateClockEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create clock event for any date - auto approve if scheduled day, pending if not"""

    event_date = datetime.strptime(event_data.date, '%Y-%m-%d').date()
    event_weekday = event_date.weekday()  # Python: 0=Monday

    # Employees can only create events for current week
    if current_user.role == 'employee':
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday() if today.weekday() != 6 else 6)
        week_end = week_start + timedelta(days=6)

        if event_date < week_start or event_date > week_end:
            raise HTTPException(
                status_code=403,
                detail="Can only create events for current week. Contact admin for past weeks."
            )

    # Check if event already exists for this date
    existing = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id,
        ClockEvent.date == event_date
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Clock event already exists for this date")

    # Check if user is scheduled on this day
    # Get JavaScript day numbers (0=Sunday, 1=Monday, etc.)
    js_scheduled_days = [
        ws.day_of_week for ws in db.query(WorkSchedule).filter(
            WorkSchedule.user_id == current_user.id
        ).all()
    ]

    # Convert to Python day numbers (0=Monday, 1=Tuesday, etc.)
    py_scheduled_days = [(js_day - 1) % 7 for js_day in js_scheduled_days]

    print(f"[CONVERSION] create_event user={current_user.username}: JS days: {js_scheduled_days} → Python days: {py_scheduled_days}, Event weekday: {event_weekday}")

    is_scheduled = event_weekday in py_scheduled_days

    # Create clock event
    clock_event = ClockEvent(
        user_id=current_user.id,
        date=event_date,
        clock_in=datetime.strptime(event_data.clock_in, '%H:%M:%S').time(),
        clock_out=datetime.strptime(event_data.clock_out, '%H:%M:%S').time(),
        came_by_car=event_data.came_by_car,
        parking_cost=event_data.parking_cost,
        km_driven=event_data.km_driven,
        status='approved' if is_scheduled else 'pending',
        requested_reason=event_data.reason if not is_scheduled else None
    )

    db.add(clock_event)
    db.commit()
    db.refresh(clock_event)

    return {
        "message": "Clock event created" if is_scheduled else "Request submitted for admin approval",
        "event": clock_event_to_dict(clock_event),
        "requires_approval": not is_scheduled
    }

@router.post("/in")
async def clock_in(
    clock_data: ClockInRequest,
    clock_date: date_type = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clock in - auto approve if scheduled day, pending if not"""

    if current_user.role != 'employee':
        raise HTTPException(status_code=403, detail="Only employees can clock in")

    # Default to today if no date specified
    if clock_date is None:
        clock_date = datetime.now().date()

    # Check if user is scheduled today
    clock_date_weekday = clock_date.weekday()  # Python: 0=Monday

    # Get JavaScript day numbers (0=Sunday, 1=Monday, etc.)
    js_scheduled_days = [
        ws.day_of_week for ws in db.query(WorkSchedule).filter(
            WorkSchedule.user_id == current_user.id
        ).all()
    ]

    # Convert to Python day numbers (0=Monday, 1=Tuesday, etc.)
    py_scheduled_days = [(js_day - 1) % 7 for js_day in js_scheduled_days]

    print(f"[CONVERSION] clock_in user={current_user.username}: JS days: {js_scheduled_days} → Python days: {py_scheduled_days}, Clock date weekday: {clock_date_weekday}")

    is_scheduled = clock_date_weekday in py_scheduled_days

    # If not scheduled and no reason provided, reject
    if not is_scheduled and not clock_data.reason:
        raise HTTPException(
            status_code=400,
            detail="Reason required for non-scheduled day"
        )

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

    # AUTO-CLOSE OPEN ABSENCES
    open_absence = db.query(Absence).filter(
        Absence.user_id == current_user.id,
        Absence.end_date == None,
        Absence.status == 'approved'
    ).first()

    if open_absence and open_absence.start_date < clock_date:
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
        km_driven=clock_data.km_driven,
        status='approved' if is_scheduled else 'pending',
        requested_reason=clock_data.reason if not is_scheduled else None
    )

    db.add(clock_event)
    db.commit()
    db.refresh(clock_event)

    return {
        "message": "Clocked in successfully" if is_scheduled else "Clock in request submitted for approval",
        "event": clock_event_to_dict(clock_event),
        "requires_approval": not is_scheduled
    }

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

@router.get("/my-events")
async def get_my_clock_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get my clock events history"""

    events = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id
    ).order_by(ClockEvent.date.desc()).all()

    return [clock_event_to_dict(e) for e in events]

@router.get("/today")
async def get_today_event(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get my clock event for today"""

    today = datetime.now().date()

    event = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id,
        ClockEvent.date == today
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="No clock event for today")

    return clock_event_to_dict(event)

@router.post("/out")
async def clock_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clock out - updates today's clock event with current time"""

    today = datetime.now().date()

    event = db.query(ClockEvent).filter(
        ClockEvent.user_id == current_user.id,
        ClockEvent.date == today
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="No clock in event found for today")

    # Update clock out time
    event.clock_out = datetime.now().time()
    event.modified_at = datetime.now()
    event.modified_by = current_user.id

    db.commit()
    db.refresh(event)

    return {
        "message": "Clocked out successfully",
        "event": event
    }

@router.get("/all-events")
async def get_all_clock_events(
    start_date: date_type = Query(...),
    end_date: date_type = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get ALL clock events for ALL employees in date range (admin only)"""

    events = db.query(ClockEvent).filter(
        ClockEvent.date >= start_date,
        ClockEvent.date <= end_date
    ).order_by(ClockEvent.date.desc()).all()

    # Add username to each event
    result = []
    for event in events:
        user = db.query(User).filter(User.id == event.user_id).first()
        event_dict = {
            "id": event.id,
            "user_id": event.user_id,
            "username": user.username if user else "Unknown",
            "date": event.date,
            "clock_in": event.clock_in,
            "clock_out": event.clock_out,
            "came_by_car": event.came_by_car,
            "parking_cost": float(event.parking_cost) if event.parking_cost else None,
            "km_driven": float(event.km_driven) if event.km_driven else None,
        }
        result.append(event_dict)

    return result

@router.get("/pending")
async def get_pending_clock_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all pending clock events (admin only)"""

    pending_events = db.query(ClockEvent).filter(
        ClockEvent.status == 'pending'
    ).order_by(ClockEvent.created_at.desc()).all()

    # Add username to each
    result = []
    for event in pending_events:
        user = db.query(User).filter(User.id == event.user_id).first()
        result.append({
            "id": event.id,
            "user_id": event.user_id,
            "username": user.username if user else "Unknown",
            "date": str(event.date),
            "clock_in": str(event.clock_in),
            "clock_out": str(event.clock_out),
            "came_by_car": event.came_by_car,
            "parking_cost": float(event.parking_cost) if event.parking_cost else None,
            "km_driven": float(event.km_driven) if event.km_driven else None,
            "requested_reason": event.requested_reason,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "status": event.status
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

@router.patch("/{event_id}")
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

    return clock_event_to_dict(event)

@router.patch("/{event_id}/approve")
async def approve_clock_event(
    event_id: int,
    request_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Approve pending clock event (admin only)"""
    from app.utils.email import send_email

    event = db.query(ClockEvent).filter(ClockEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Clock event not found")

    if event.status != 'pending':
        raise HTTPException(status_code=400, detail="Event is not pending")

    event.status = 'approved'
    event.modified_at = datetime.now()
    event.modified_by = current_user.id

    db.commit()
    db.refresh(event)

    # Send approval email
    admin_notes = request_data.get('admin_notes') if request_data else None
    user = db.query(User).filter(User.id == event.user_id).first()
    if user and user.email:
        try:
            body = f"""Hallo {user.username},

Je uurregistratie is goedgekeurd:

Datum: {event.date.strftime('%d-%m-%Y')}
Tijd: {event.clock_in.strftime('%H:%M')} - {event.clock_out.strftime('%H:%M')}
{f'Reden: {event.requested_reason}' if event.requested_reason else ''}"""

            if admin_notes:
                body += f"""

Bericht van admin:
{admin_notes}"""

            body += """

Groeten,
HR Team"""

            await send_email(
                to_email=user.email,
                subject="Uurregistratie Goedgekeurd",
                body=body
            )
        except Exception as e:
            print(f"Failed to send approval email: {e}")

    return clock_event_to_dict(event)

@router.delete("/{event_id}")
async def delete_clock_event(
    event_id: int,
    request_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete clock event - admin can delete any, employees only their own from current week"""
    from app.utils.email import send_email

    event = db.query(ClockEvent).filter(ClockEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Clock event not found")

    # Check permissions
    if current_user.role == 'employee':
        if event.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Check current week
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        if event.date < week_start:
            raise HTTPException(status_code=403, detail="Cannot delete past week events")

    # Get user for email
    admin_notes = request_data.get('admin_notes') if request_data else None
    user = db.query(User).filter(User.id == event.user_id).first()
    was_pending = event.status == 'pending'
    event_date = event.date.strftime('%d-%m-%Y')
    requested_reason = event.requested_reason

    db.delete(event)
    db.commit()

    # Send rejection email if it was pending (admin rejected it)
    if was_pending and current_user.role == 'admin' and user and user.email:
        try:
            body = f"""Hallo {user.username},

Je uurregistratie is afgewezen:

Datum: {event_date}
{f'Reden: {requested_reason}' if requested_reason else ''}"""

            if admin_notes:
                body += f"""

Bericht van admin:
{admin_notes}"""

            body += """

Neem contact op met HR voor meer informatie.

Groeten,
HR Team"""

            await send_email(
                to_email=user.email,
                subject="Uurregistratie Afgewezen",
                body=body
            )
        except Exception as e:
            print(f"Failed to send rejection email: {e}")

    return {"message": "Clock event deleted"}
@router.patch("/{event_id}/edit")
async def edit_clock_event(
    event_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Edit and approve clock event (admin only)"""
    
    event = db.query(ClockEvent).filter(ClockEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Clock event not found")
    
    # Update fields - PARSE TIMES PROPERLY
    if 'clock_in' in updates:
        # Parse HH:MM:SS string to time object
        event.clock_in = datetime.strptime(updates['clock_in'], '%H:%M:%S').time()

    if 'clock_out' in updates:
        # Parse HH:MM:SS string to time object
        event.clock_out = datetime.strptime(updates['clock_out'], '%H:%M:%S').time()

    if 'came_by_car' in updates:
        event.came_by_car = updates['came_by_car']

    if 'parking_cost' in updates:
        event.parking_cost = float(updates['parking_cost']) if updates['parking_cost'] else None

    if 'km_driven' in updates:
        event.km_driven = float(updates['km_driven']) if updates['km_driven'] else None
    
    # Auto-approve after edit
    event.status = 'approved'
    
    db.commit()
    db.refresh(event)
    
    return clock_event_to_dict(event)
