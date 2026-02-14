from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from holidays import country_holidays
from app.database import get_db
from app.models import User, EventCategory, CalendarEvent, EventAssignment, CompanyHoliday
from app.schemas import (
    EventCategoryCreate, EventCategoryResponse,
    CalendarEventCreate, CalendarEventResponse, CalendarEventDetail,
    CompanyHolidayCreate, CompanyHolidayResponse, CalendarEventUpdate
)
from app.dependencies import get_current_user, get_current_admin

router = APIRouter()

# Dutch holiday name translations
DUTCH_HOLIDAY_NAMES = {
    "New Year's Day": "Nieuwjaarsdag",
    "Good Friday": "Goede Vrijdag",
    "Easter Sunday": "Eerste Paasdag",
    "Easter Monday": "Tweede Paasdag",
    "King's Day": "Koningsdag",
    "Liberation Day": "Bevrijdingsdag",
    "Ascension Day": "Hemelvaartsdag",
    "Whit Sunday": "Eerste Pinksterdag",
    "Whit Monday": "Tweede Pinksterdag",
    "Christmas Day": "Eerste Kerstdag",
    "Boxing Day": "Tweede Kerstdag",
}

# ============================================
# EVENT CATEGORIES
# ============================================

@router.post("/categories", response_model=EventCategoryResponse)
async def create_category(
    category_data: EventCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create event category (admin only)"""
    
    # Check if category name already exists
    existing = db.query(EventCategory).filter(
        EventCategory.name == category_data.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category = EventCategory(
        name=category_data.name,
        color=category_data.color
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return category

@router.get("/categories", response_model=List[EventCategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all event categories"""
    
    categories = db.query(EventCategory).all()
    return categories

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete event category (admin only)"""
    
    category = db.query(EventCategory).filter(EventCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}

# ============================================
# CALENDAR EVENTS
# ============================================

@router.post("/events", response_model=CalendarEventResponse)
async def create_event(
    event_data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create calendar event (employee suggests, admin creates directly)"""
    
    # Validate visibility
    if event_data.visibility not in ['all', 'specific']:
        raise HTTPException(status_code=400, detail="Visibility must be 'all' or 'specific'")
    
    # If specific visibility, must have assigned users
    if event_data.visibility == 'specific' and not event_data.assigned_user_ids:
        raise HTTPException(
            status_code=400,
            detail="Must provide assigned_user_ids for specific visibility"
        )
    
    # Validate category exists if provided
    if event_data.category_id is not None:
        category = db.query(EventCategory).filter(
            EventCategory.id == event_data.category_id
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Determine status: admin creates approved, employee creates pending
    if current_user.role in ['admin', 'developer']:
        status = 'approved'
    else:
        status = 'pending'
    
    # Create event
    event = CalendarEvent(
        title=event_data.title,
        description=event_data.description,
        category_id=event_data.category_id,
        date=event_data.date,
        time_start=event_data.time_start,
        time_end=event_data.time_end,
        visibility=event_data.visibility,
        status=status,
        created_by=current_user.id
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Add assignments if specific visibility
    if event_data.visibility == 'specific' and event_data.assigned_user_ids:
        for user_id in event_data.assigned_user_ids:
            # Verify user exists
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                assignment = EventAssignment(event_id=event.id, user_id=user_id)
                db.add(assignment)
        
        db.commit()
    
    return event

@router.get("/events", response_model=List[CalendarEventResponse])
async def get_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get calendar events (filtered by visibility and role)"""
    
    if current_user.role in ['admin', 'developer']:
        # Admin sees all events
        events = db.query(CalendarEvent).order_by(CalendarEvent.date.desc()).all()
    else:
        # Employee sees:
        # 1. All events with visibility='all' and status='approved'
        # 2. Events assigned to them (visibility='specific')
        # 3. Events they created
        
        # Get event IDs assigned to this user
        assigned_event_ids = [
            ea.event_id for ea in db.query(EventAssignment).filter(
                EventAssignment.user_id == current_user.id
            ).all()
        ]
        
        events = db.query(CalendarEvent).filter(
            (
                (CalendarEvent.visibility == 'all') & (CalendarEvent.status == 'approved')
            ) | (
                CalendarEvent.id.in_(assigned_event_ids)
            ) | (
                CalendarEvent.created_by == current_user.id
            )
        ).order_by(CalendarEvent.date.desc()).all()
    
    return events

@router.get("/events/{event_id}", response_model=CalendarEventDetail)
async def get_event_detail(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get event details"""
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get assigned users
    assigned_user_ids = [
        ea.user_id for ea in db.query(EventAssignment).filter(
            EventAssignment.event_id == event_id
        ).all()
    ]
    
    return {
        **event.__dict__,
        "assigned_users": assigned_user_ids
    }

@router.patch("/events/{event_id}/approve", response_model=CalendarEventResponse)
async def approve_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Approve suggested event (admin only)"""
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve event with status '{event.status}'"
        )
    
    event.status = 'approved'
    event.reviewed_at = datetime.now()
    event.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(event)
    
    return event

@router.patch("/events/{event_id}/reject", response_model=CalendarEventResponse)
async def reject_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Reject suggested event (admin only)"""
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject event with status '{event.status}'"
        )
    
    event.status = 'rejected'
    event.reviewed_at = datetime.now()
    event.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(event)
    
    return event

@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: int,
    update_data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update event (admin only)"""
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Update fields if provided
    if update_data.title is not None:
        event.title = update_data.title
    if update_data.description is not None:
        event.description = update_data.description
    if update_data.category_id is not None:
        # Validate category exists
        category = db.query(EventCategory).filter(
            EventCategory.id == update_data.category_id
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        event.category_id = update_data.category_id
    if update_data.date is not None:
        event.date = update_data.date
    if update_data.time_start is not None:
        event.time_start = update_data.time_start
    if update_data.time_end is not None:
        event.time_end = update_data.time_end
    if update_data.visibility is not None:
        if update_data.visibility not in ['all', 'specific']:
            raise HTTPException(
                status_code=400,
                detail="Visibility must be 'all' or 'specific'"
            )
        event.visibility = update_data.visibility
    
    # Update assignments if provided
    if update_data.assigned_user_ids is not None:
        # Delete existing assignments
        db.query(EventAssignment).filter(
            EventAssignment.event_id == event_id
        ).delete()
        
        # Add new assignments
        for user_id in update_data.assigned_user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                assignment = EventAssignment(event_id=event_id, user_id=user_id)
                db.add(assignment)
    
    db.commit()
    db.refresh(event)
    
    return event

@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete event (admin only)"""
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()

    return {"message": "Event deleted successfully"}

# ============================================
# COMPANY HOLIDAYS
# ============================================

@router.post("/holidays", response_model=CompanyHolidayResponse)
async def create_holiday(
    holiday_data: CompanyHolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create company holiday (admin only)"""
    
    # Check if holiday already exists for this date
    existing = db.query(CompanyHoliday).filter(
        CompanyHoliday.date == holiday_data.date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Holiday already exists for {holiday_data.date}"
        )
    
    holiday = CompanyHoliday(
        name=holiday_data.name,
        date=holiday_data.date,
        created_by=current_user.id
    )
    
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    
    return holiday

@router.post("/holidays/import-dutch/{year}")
async def import_dutch_holidays(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Import official Dutch holidays for a year (admin only)"""

    if year < 2020 or year > 2030:
        raise HTTPException(
            status_code=400,
            detail="Year must be between 2020 and 2030"
        )

    # Get Dutch holidays for the year
    nl_holidays = country_holidays('NL', years=year)

    created_count = 0
    skipped_count = 0

    for date, name in nl_holidays.items():
        # Translate to Dutch
        dutch_name = DUTCH_HOLIDAY_NAMES.get(name, name)

        # Check if holiday already exists
        existing = db.query(CompanyHoliday).filter(
            CompanyHoliday.date == date
        ).first()

        if existing:
            skipped_count += 1
            continue

        # Create holiday with Dutch name
        holiday = CompanyHoliday(
            name=dutch_name,
            date=date,
            created_by=current_user.id
        )
        db.add(holiday)
        created_count += 1

    db.commit()

    return {
        "message": f"Imported {created_count} Dutch holidays for {year}",
        "created": created_count,
        "skipped": skipped_count,
        "year": year
    }

@router.get("/holidays", response_model=List[CompanyHolidayResponse])
async def get_holidays(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all company holidays"""
    
    holidays = db.query(CompanyHoliday).order_by(CompanyHoliday.date).all()
    return holidays

@router.delete("/holidays/{holiday_id}")
async def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete company holiday (admin only)"""

    from datetime import datetime

    holiday = db.query(CompanyHoliday).filter(CompanyHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    # Prevent deleting past holidays
    today = datetime.now().date()
    if holiday.date < today:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete past holidays - this would affect balance calculations"
        )

    db.delete(holiday)
    db.commit()

    return {"message": "Holiday deleted successfully"}