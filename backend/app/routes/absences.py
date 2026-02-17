from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date as date_type
from app.database import get_db
from app.models import User, Absence, ClockEvent
from app.schemas import (
    AbsenceRequest,
    AbsenceResponse,
    RejectAbsenceRequest,
    UpdateAbsenceRequest,
    AdminCreateAbsenceRequest
)
from app.dependencies import get_current_user, get_current_admin
from app.utils.email import send_email

router = APIRouter()

# Dutch translations for absence types
ABSENCE_TYPES_NL = {
    "sick": "ziek",
    "personal": "persoonlijk verlof",
    "vacation": "vakantie"
}

def format_date_nl(date_obj):
    """Format date in Dutch style: 8 februari 2026"""
    months_nl = [
        'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ]
    return f"{date_obj.day} {months_nl[date_obj.month - 1]} {date_obj.year}"

@router.post("/", response_model=AbsenceResponse)
async def request_absence(
    absence_data: AbsenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Request absence (sick/personal/vacation)"""
    
    if current_user.role != 'employee':
        raise HTTPException(status_code=403, detail="Only employees can request absences")
    
    if absence_data.type not in ['sick', 'personal', 'vacation']:
        raise HTTPException(
            status_code=400,
            detail="Absence type must be 'sick', 'personal', or 'vacation'"
        )

    open_absence = db.query(Absence).filter(
        Absence.user_id == current_user.id,
        Absence.end_date == None,
        Absence.status == 'approved'
    ).first()
    
    if open_absence:
        raise HTTPException(
            status_code=400,
            detail=f"You already have an open absence starting {open_absence.start_date}"
        )

    # Check if user already has an absence starting on this date
    existing = db.query(Absence).filter(
        Absence.user_id == current_user.id,
        Absence.start_date == absence_data.start_date
    ).first()

    if existing:
        # If it's rejected, allow user to request again by deleting the old one
        if existing.status == 'rejected':
            db.delete(existing)
            db.commit()
        # If it's pending or approved, don't allow duplicate
        elif existing.status == 'pending':
            raise HTTPException(
                status_code=400,
                detail="Je hebt al een aanvraag voor deze datum in behandeling"
            )
        elif existing.status == 'approved':
            raise HTTPException(
                status_code=400,
                detail="Je hebt al goedgekeurd verlof voor deze datum"
            )

    absence = Absence(
        user_id=current_user.id,
        start_date=absence_data.start_date,
        end_date=absence_data.end_date,
        type=absence_data.type,
        reason=absence_data.reason,
        status='pending'
    )
    
    db.add(absence)
    db.commit()
    db.refresh(absence)

    return absence

@router.post("/admin", response_model=AbsenceResponse)
async def admin_create_absence(
    absence_data: AdminCreateAbsenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create absence for employee (admin only)"""

    # Validate user exists
    user = db.query(User).filter(User.id == absence_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate absence type
    if absence_data.type not in ['sick', 'personal', 'vacation']:
        raise HTTPException(
            status_code=400,
            detail="Absence type must be 'sick', 'personal', or 'vacation'"
        )

    # Create absence
    absence = Absence(
        user_id=absence_data.user_id,
        start_date=absence_data.start_date,
        end_date=None,
        type=absence_data.type,
        reason=absence_data.reason,
        status='approved' if absence_data.auto_approve else 'pending',
        reviewed_at=datetime.now() if absence_data.auto_approve else None,
        reviewed_by=current_user.id if absence_data.auto_approve else None
    )

    db.add(absence)
    db.commit()
    db.refresh(absence)

    return absence

@router.post("/bulk")
async def create_bulk_absences(
    user_ids: List[int],
    start_date: date_type,
    end_date: Optional[date_type] = None,
    absence_type: str = "vacation",
    reason: str = "Bedrijfsvakantie",
    auto_approve: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create absences for multiple employees at once (admin only)"""

    # Validate type
    if absence_type not in ['sick', 'personal', 'vacation']:
        raise HTTPException(status_code=400, detail="Invalid absence type")

    # Validate dates
    if end_date and end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    created_absences = []
    failed_users = []

    for user_id in user_ids:
        try:
            # Check user exists and is active
            user = db.query(User).filter(
                User.id == user_id,
                User.role == 'employee',
                User.is_active == True
            ).first()

            if not user:
                failed_users.append(user_id)
                continue

            # Create absence
            absence = Absence(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
                type=absence_type,
                reason=reason,
                status='approved' if auto_approve else 'pending',
            )

            if auto_approve:
                absence.reviewed_at = datetime.now()
                absence.reviewed_by = current_user.id

            db.add(absence)
            created_absences.append(user_id)

        except Exception as e:
            failed_users.append(user_id)
            continue

    db.commit()

    return {
        "message": f"Created {len(created_absences)} absences",
        "created_count": len(created_absences),
        "failed_count": len(failed_users),
        "created_users": created_absences,
        "failed_users": failed_users
    }

@router.get("/my-absences", response_model=List[AbsenceResponse])
async def get_my_absences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get my absence requests"""
    
    absences = db.query(Absence).filter(
        Absence.user_id == current_user.id
    ).order_by(Absence.start_date.desc()).all()
    
    return absences

@router.get("/pending", response_model=List[AbsenceResponse])
async def get_pending_absences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all pending absence requests (admin only)"""

    # Join with User to filter only active users
    absences = db.query(Absence).join(
        User, Absence.user_id == User.id
    ).filter(
        Absence.status == 'pending',
        User.is_active == True
    ).order_by(Absence.created_at.desc()).all()

    # Add username to each absence
    result = []
    for absence in absences:
        user = db.query(User).filter(User.id == absence.user_id).first()
        absence_dict = {
            "id": absence.id,
            "user_id": absence.user_id,
            "username": user.username if user else "Unknown",
            "start_date": absence.start_date,
            "end_date": absence.end_date,
            "type": absence.type,
            "reason": absence.reason,
            "status": absence.status,
            "created_at": absence.created_at,
            "reviewed_at": absence.reviewed_at,
            "reviewed_by": absence.reviewed_by
        }
        result.append(absence_dict)

    return result

@router.get("/all", response_model=List[AbsenceResponse])
async def get_all_absences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get ALL absences for ALL employees (admin only)"""

    absences = db.query(Absence).order_by(Absence.created_at.desc()).all()

    # Add username to each absence
    result = []
    for absence in absences:
        user = db.query(User).filter(User.id == absence.user_id).first()
        absence_dict = {
            "id": absence.id,
            "user_id": absence.user_id,
            "username": user.username if user else "Unknown",
            "start_date": absence.start_date,
            "end_date": absence.end_date,
            "type": absence.type,
            "reason": absence.reason,
            "status": absence.status,
            "created_at": absence.created_at,
            "reviewed_at": absence.reviewed_at,
            "reviewed_by": absence.reviewed_by
        }
        result.append(absence_dict)

    return result

@router.get("/user/{user_id}", response_model=List[AbsenceResponse])
async def get_user_absences(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get absences for a specific user (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    absences = db.query(Absence).filter(
        Absence.user_id == user_id
    ).order_by(Absence.start_date.desc()).all()
    
    return absences

@router.patch("/{absence_id}/approve", response_model=AbsenceResponse)
async def approve_absence(
    absence_id: int,
    request_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Approve absence request (admin only)"""

    absence = db.query(Absence).filter(Absence.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")

    if absence.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve absence with status '{absence.status}'"
        )

    # Approve absence
    absence.status = 'approved'
    absence.reviewed_at = datetime.now()
    absence.reviewed_by = current_user.id

    # Close open-ended absence if needed
    if absence.end_date is None:
        first_clock_in = db.query(ClockEvent).filter(
            ClockEvent.user_id == absence.user_id,
            ClockEvent.date > absence.start_date
        ).order_by(ClockEvent.date.asc()).first()

        if first_clock_in:
            absence.end_date = first_clock_in.date - timedelta(days=1)

    db.commit()
    db.refresh(absence)

    # Send email notification
    user = db.query(User).filter(User.id == absence.user_id).first()
    type_nl = ABSENCE_TYPES_NL.get(absence.type, absence.type)
    start_date_nl = format_date_nl(absence.start_date)
    admin_notes = request_data.get('admin_notes') if request_data else None

    if absence.end_date and absence.end_date != absence.start_date:
        end_date_nl = format_date_nl(absence.end_date)
        date_range = f"{start_date_nl} t/m {end_date_nl}"
    else:
        date_range = start_date_nl

    email_body = f"""Hoi {user.username},

Je {type_nl} aanvraag voor {date_range} is GOEDGEKEURD."""

    if admin_notes:
        email_body += f"""

Bericht van admin:
{admin_notes}"""

    email_body += """

Met vriendelijke groet,
HR Team"""

    await send_email(
        to_email=user.email,
        subject=f"Verlofaanvraag Goedgekeurd - {type_nl.title()}",
        body=email_body
    )

    return absence

@router.patch("/{absence_id}/reject", response_model=AbsenceResponse)
async def reject_absence(
    absence_id: int,
    request: RejectAbsenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Reject absence request (admin only)"""
    
    absence = db.query(Absence).filter(Absence.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    
    if absence.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject absence with status '{absence.status}'"
        )
    
    # Reject absence
    absence.status = 'rejected'
    absence.reviewed_at = datetime.now()
    absence.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(absence)
    
    # Send email notification
    user = db.query(User).filter(User.id == absence.user_id).first()
    type_nl = ABSENCE_TYPES_NL.get(absence.type, absence.type)
    start_date_nl = format_date_nl(absence.start_date)

    if request.admin_notes:
        # Custom message
        email_body = f"""
Hoi {user.username},

Je {type_nl} aanvraag voor {start_date_nl} is AFGEWEZEN.

Reden:
{request.admin_notes}

Neem contact op met HR als je vragen hebt.

Met vriendelijke groet,
HR Team
"""
    else:
        # Default message
        if absence.end_date and absence.end_date != absence.start_date:
            end_date_nl = format_date_nl(absence.end_date)
            date_range = f"{start_date_nl} t/m {end_date_nl}"
        else:
            date_range = start_date_nl

        email_body = f"""
Hoi {user.username},

Je {type_nl} aanvraag voor {date_range} is AFGEWEZEN.

Neem contact op met HR voor meer informatie.

Met vriendelijke groet,
HR Team
"""
    
    await send_email(
        to_email=user.email,
        subject=f"Verlofaanvraag Afgewezen - {type_nl.title()}",
        body=email_body
    )
    
    return absence

@router.patch("/{absence_id}", response_model=AbsenceResponse)
async def update_absence(
    absence_id: int,
    request: UpdateAbsenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update absence (admin only)"""

    absence = db.query(Absence).filter(Absence.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")

    # Update fields if provided
    if request.start_date is not None:
        absence.start_date = request.start_date
    if request.reason is not None:
        absence.reason = request.reason

    db.commit()
    db.refresh(absence)

    return absence

@router.delete("/{absence_id}")
async def delete_absence(
    absence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete absence request"""
    
    absence = db.query(Absence).filter(Absence.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    
    # Check permissions
    if current_user.role == 'admin':
        can_delete = True
    elif absence.user_id == current_user.id:
        # Employees can only delete their own pending absences
        can_delete = absence.status == 'pending'
    else:
        can_delete = False

    if not can_delete:
        raise HTTPException(
            status_code=403,
            detail="Can only delete pending absences" if current_user.role == 'employee' else "Cannot delete this absence"
        )
    
    db.delete(absence)
    db.commit()
    
    return {"message": "Absence deleted successfully"}
@router.patch("/{absence_id}/edit")
async def edit_absence(
    absence_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Edit and approve absence (admin only)"""
    
    from datetime import datetime as dt
    
    absence = db.query(Absence).filter(Absence.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    
    # Update fields - PARSE DATES PROPERLY
    if 'type' in updates:
        absence.type = updates['type']

    if 'start_date' in updates:
        # Parse string to date object
        absence.start_date = dt.strptime(updates['start_date'], '%Y-%m-%d').date()

    if 'end_date' in updates:
        if updates['end_date']:
            # Parse string to date object
            absence.end_date = dt.strptime(updates['end_date'], '%Y-%m-%d').date()
        else:
            absence.end_date = None

    if 'reason' in updates:
        absence.reason = updates['reason']
    
    # Auto-approve after edit
    absence.status = 'approved'
    absence.reviewed_at = dt.now()
    absence.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(absence)
    
    return absence
