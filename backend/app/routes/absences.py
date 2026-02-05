from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Absence, ClockEvent
from app.schemas import AbsenceRequest, AbsenceResponse
from app.dependencies import get_current_user, get_current_admin

router = APIRouter()

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
    ).order_by(Absence.start_date.desc()).all()
    
    return absences

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
    
    absence.status = 'approved'
    absence.reviewed_at = datetime.now()
    absence.reviewed_by = current_user.id
    
    if absence.end_date is None:  
        first_clock_in = db.query(ClockEvent).filter(
            ClockEvent.user_id == absence.user_id,
            ClockEvent.date > absence.start_date
        ).order_by(ClockEvent.date.asc()).first()
        
        if first_clock_in:
            absence.end_date = first_clock_in.date - timedelta(days=1)
    
    db.commit()
    db.refresh(absence)
    
    return absence

@router.patch("/{absence_id}/reject", response_model=AbsenceResponse)
async def reject_absence(
    absence_id: int,
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
    
    absence.status = 'rejected'
    absence.reviewed_at = datetime.now()
    absence.reviewed_by = current_user.id
    
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
    # Admin can delete any absence
    # Employee can only delete their own absences from current week
    if current_user.role == 'admin':
        can_delete = True
    elif absence.user_id == current_user.id:
        # Check if within current week (Monday to Sunday)
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())  # Monday
        week_end = week_start + timedelta(days=6)  # Sunday
        can_delete = week_start <= absence.date <= week_end
    else:
        can_delete = False
    
    if not can_delete:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete this absence (outside current week or not your absence)"
        )
    
    db.delete(absence)
    db.commit()
    
    return {"message": "Absence deleted successfully"}