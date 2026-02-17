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

@router.get("/events")
async def get_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get calendar events with category info (approved only, pending events shown only in Approvals page)"""

    if current_user.role in ['admin', 'developer']:
        # Admin sees ONLY approved events in calendar
        # Pending/rejected events are shown in Approvals page only
        events = db.query(CalendarEvent).filter(
            CalendarEvent.status == 'approved'
        ).order_by(CalendarEvent.date.desc()).all()
    else:
        # Employee sees:
        # 1. All events with visibility='all' and status='approved'
        # 2. Events assigned to them with status='approved'
        # 3. Events they created with status='pending' or 'approved' (NOT rejected)

        # Get event IDs assigned to this user
        assigned_event_ids = [
            ea.event_id for ea in db.query(EventAssignment).filter(
                EventAssignment.user_id == current_user.id
            ).all()
        ]

        events = db.query(CalendarEvent).filter(
            (
                # Public approved events
                (CalendarEvent.visibility == 'all') & (CalendarEvent.status == 'approved')
            ) | (
                # Assigned events (approved only)
                (CalendarEvent.id.in_(assigned_event_ids)) & (CalendarEvent.status == 'approved')
            ) | (
                # Own events (pending or approved, NOT rejected)
                (CalendarEvent.created_by == current_user.id) & (CalendarEvent.status.in_(['pending', 'approved']))
            )
        ).order_by(CalendarEvent.date.desc()).all()

    # Format response with category info
    result = []
    for event in events:
        # Get category details if exists
        category = None
        if event.category_id:
            category = db.query(EventCategory).filter(
                EventCategory.id == event.category_id
            ).first()

        event_dict = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "date": event.date,
            "time_start": event.time_start,
            "time_end": event.time_end,
            "category_id": event.category_id,
            "category_name": category.name if category else None,
            "category_color": category.color if category else "#6b7280",  # Gray default
            "visibility": event.visibility,
            "status": event.status,
            "created_by": event.created_by,
            "created_at": event.created_at,
            "reviewed_at": event.reviewed_at,
            "reviewed_by": event.reviewed_by
        }
        result.append(event_dict)

    return result

@router.get("/events/pending", response_model=List[CalendarEventResponse])
async def get_pending_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all pending event suggestions (admin only)"""

    events = db.query(CalendarEvent).filter(
        CalendarEvent.status == 'pending'
    ).order_by(CalendarEvent.created_at.desc()).all()

    # Add username to each event
    result = []
    for event in events:
        user = db.query(User).filter(User.id == event.created_by).first()
        event_dict = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "category_id": event.category_id,
            "date": event.date,
            "time_start": event.time_start,
            "time_end": event.time_end,
            "visibility": event.visibility,
            "status": event.status,
            "created_by": event.created_by,
            "username": user.username if user else "Unknown",
            "created_at": event.created_at,
            "reviewed_at": event.reviewed_at,
            "reviewed_by": event.reviewed_by
        }
        result.append(event_dict)

    return result

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
    request_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Approve suggested event (admin only)"""

    from app.utils.email import send_email

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

    # Send approval email
    admin_notes = request_data.get('admin_notes') if request_data else None
    creator = db.query(User).filter(User.id == event.created_by).first()
    if creator and creator.email:
        try:
            event_date = event.date.strftime('%d-%m-%Y')

            category_name = ''
            if event.category_id:
                category = db.query(EventCategory).filter(EventCategory.id == event.category_id).first()
                if category:
                    category_name = category.name

            body = f"""Hallo {creator.username},

Je evenementvoorstel is goedgekeurd:

Titel: {event.title}
Datum: {event_date}
"""
            if category_name:
                body += f"Categorie: {category_name}\n"

            if event.time_start:
                body += f"Tijd: {event.time_start.strftime('%H:%M')}"
                if event.time_end:
                    body += f" - {event.time_end.strftime('%H:%M')}"
                body += "\n"

            if event.description:
                body += f"\nBeschrijving: {event.description}\n"

            if admin_notes:
                body += f"\nBericht van admin:\n{admin_notes}\n"

            body += """
Groeten,
HR Team"""

            await send_email(
                to_email=creator.email,
                subject="Evenement Goedgekeurd",
                body=body.strip()
            )
        except Exception as e:
            print(f"Failed to send approval email: {e}")

    return event

@router.patch("/events/{event_id}/reject")
async def reject_event(
    event_id: int,
    reject_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Reject (delete) event (admin only)"""

    from app.utils.email import send_email

    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject event with status '{event.status}'"
        )

    # Get creator info before deleting
    creator = db.query(User).filter(User.id == event.created_by).first()

    # Save event details for email (before deletion)
    event_title = event.title
    event_date = event.date.strftime('%d-%m-%Y')
    event_description = event.description

    # Get category name if exists
    category_name = ''
    if event.category_id:
        category = db.query(EventCategory).filter(EventCategory.id == event.category_id).first()
        if category:
            category_name = category.name

    admin_notes = reject_data.get('admin_notes') if reject_data else None

    print(f"[REJECT] Deleting event {event_id} from database")

    # DELETE the event (don't just mark as rejected)
    db.delete(event)
    db.commit()

    print(f"[REJECT] Event deleted from database")

    # Send rejection email
    if creator and creator.email:
        try:
            body = f"""Hallo {creator.username},

Je evenementvoorstel is afgewezen:

Titel: {event_title}
Datum: {event_date}
"""
            if category_name:
                body += f"Categorie: {category_name}\n"

            if admin_notes:
                body += f"\nReden: {admin_notes}\n"

            body += """
Neem contact op met HR voor meer informatie.

Groeten,
HR Team
"""

            await send_email(
                to_email=creator.email,
                subject="Evenement Afgewezen",
                body=body.strip()
            )
        except Exception as e:
            print(f"Failed to send rejection email: {e}")

    return {"message": "Event rejected and deleted"}

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

@router.patch("/events/{event_id}/edit")
async def edit_event(
    event_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Edit and approve event (admin only)"""

    from datetime import datetime as dt

    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update fields - PARSE DATES AND TIMES PROPERLY
    if 'title' in updates:
        event.title = updates['title']

    if 'description' in updates:
        event.description = updates['description']

    if 'category_id' in updates:
        if updates['category_id']:
            category = db.query(EventCategory).filter(
                EventCategory.id == updates['category_id']
            ).first()
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            event.category_id = updates['category_id']
        else:
            event.category_id = None

    if 'date' in updates:
        # Parse string to date object
        event.date = dt.strptime(updates['date'], '%Y-%m-%d').date()

    if 'time_start' in updates:
        if updates['time_start']:
            # Parse string to time object
            event.time_start = dt.strptime(updates['time_start'], '%H:%M:%S').time()
        else:
            event.time_start = None

    if 'time_end' in updates:
        if updates['time_end']:
            # Parse string to time object
            event.time_end = dt.strptime(updates['time_end'], '%H:%M:%S').time()
        else:
            event.time_end = None

    if 'visibility' in updates:
        event.visibility = updates['visibility']

    # Update assignments if provided
    if 'assigned_user_ids' in updates:
        # Delete existing assignments
        db.query(EventAssignment).filter(
            EventAssignment.event_id == event_id
        ).delete()

        # Add new assignments
        if updates['assigned_user_ids']:
            for user_id in updates['assigned_user_ids']:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    assignment = EventAssignment(event_id=event_id, user_id=user_id)
                    db.add(assignment)

    # Auto-approve after edit
    event.status = 'approved'
    event.reviewed_at = dt.now()
    event.reviewed_by = current_user.id

    db.commit()
    db.refresh(event)

    # Send approval email AFTER edit
    from app.utils.email import send_email

    creator = db.query(User).filter(User.id == event.created_by).first()
    if creator and creator.email:
        try:
            # Format date in Dutch style
            event_date = event.date.strftime('%d-%m-%Y')

            # Get category name if exists
            category_name = ''
            if event.category_id:
                category = db.query(EventCategory).filter(EventCategory.id == event.category_id).first()
                if category:
                    category_name = category.name

            body = f"""Hallo {creator.username},

Je evenementvoorstel is goedgekeurd (met aanpassingen):

Titel: {event.title}
Datum: {event_date}
"""
            if category_name:
                body += f"Categorie: {category_name}\n"

            if event.time_start:
                body += f"Tijd: {event.time_start.strftime('%H:%M')}"
                if event.time_end:
                    body += f" - {event.time_end.strftime('%H:%M')}"
                body += "\n"

            if event.description:
                body += f"\nBeschrijving: {event.description}\n"

            body += """
Groeten,
HR Team
"""

            await send_email(
                to_email=creator.email,
                subject="Evenement Goedgekeurd",
                body=body.strip()
            )
        except Exception as e:
            print(f"Failed to send approval email after edit: {e}")

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