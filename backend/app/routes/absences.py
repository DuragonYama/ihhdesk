from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Absence, ClockEvent
from app.schemas import (
    AbsenceRequest, 
    AbsenceResponse, 
    ApproveAbsenceRequest, 
    RejectAbsenceRequest
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

    absence = Absence(
        user_id=current_user.id,
        start_date=absence_data.start_date,
        end_date=None, 
        type=absence_data.type,
        reason=absence_data.reason,
        status='pending'
    )
    
    db.add(absence)
    db.commit()
    db.refresh(absence)
    
    return absence

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
    
    absences = db.query(Absence).filter(
        Absence.status == 'pending'
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
    request: ApproveAbsenceRequest,
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
    
    if request.message:
        # Custom message
        email_body = f"""
Hoi {user.username},

Je {type_nl} aanvraag voor {start_date_nl} is GOEDGEKEURD.

Bericht van HR:
{request.message}

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

Je {type_nl} aanvraag voor {date_range} is GOEDGEKEURD.

Met vriendelijke groet,
HR Team
"""
    
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
    
    if request.message:
        # Custom message
        email_body = f"""
Hoi {user.username},

Je {type_nl} aanvraag voor {start_date_nl} is AFGEWEZEN.

Reden:
{request.message}

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
        # Check if within current week
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        can_delete = week_start <= absence.start_date <= week_end
    else:
        can_delete = False
    
    if not can_delete:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete this absence"
        )
    
    db.delete(absence)
    db.commit()
    
    return {"message": "Absence deleted successfully"}