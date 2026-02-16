from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, WorkSchedule
from app.schemas import UserResponse, UserCreate, UserUpdate, UserDetail, WorkScheduleCreate
from app.dependencies import get_current_user, get_current_admin
from app.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all users (admin only)"""
    users = db.query(User).all()
    
    # Add work_days to each user
    result = []
    for user in users:
        # Get work schedule (same pattern as get_user_detail)
        work_schedules = db.query(WorkSchedule).filter(WorkSchedule.user_id == user.id).all()
        work_days = [ws.day_of_week for ws in work_schedules]
        
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "expected_weekly_hours": user.expected_weekly_hours,
            "has_km_compensation": user.has_km_compensation,
            "work_days": work_days
        }
        
        result.append(user_dict)
    
    return result

@router.get("/me", response_model=UserResponse)
async def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current logged-in user info"""
    # Get work schedule
    work_schedules = db.query(WorkSchedule).filter(WorkSchedule.user_id == current_user.id).all()
    work_days = [ws.day_of_week for ws in work_schedules]

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "expected_weekly_hours": current_user.expected_weekly_hours,
        "has_km_compensation": current_user.has_km_compensation,
        "work_days": work_days
    }

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create new user (admin only)"""
    
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    if user_data.role not in ['admin', 'employee']:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'employee'")
    
    if user_data.role == 'employee' and not user_data.expected_weekly_hours:
        raise HTTPException(status_code=400, detail="Employee must have expected_weekly_hours")
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True,
        expected_weekly_hours=user_data.expected_weekly_hours,
        has_km_compensation=user_data.has_km_compensation,
        created_by=current_user.id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/{user_id}", response_model=UserDetail)
async def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user details including work schedule (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get work days
    work_schedules = db.query(WorkSchedule).filter(WorkSchedule.user_id == user_id).all()
    work_days = [ws.day_of_week for ws in work_schedules]
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "expected_weekly_hours": user.expected_weekly_hours,
        "has_km_compensation": user.has_km_compensation,
        "work_days": work_days
    }

@router.put("/{user_id}/schedule")
async def set_work_schedule(
    user_id: int,
    schedule: WorkScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Set user's work schedule (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != 'employee':
        raise HTTPException(status_code=400, detail="Only employees can have work schedules")
    
    # Validate days (0-6 for Monday-Sunday)
    for day in schedule.days:
        if day < 0 or day > 6:
            raise HTTPException(status_code=400, detail="Day must be between 0 (Monday) and 6 (Sunday)")
    
    db.query(WorkSchedule).filter(WorkSchedule.user_id == user_id).delete()
    
    for day in schedule.days:
        work_day = WorkSchedule(user_id=user_id, day_of_week=day)
        db.add(work_day)
    
    db.commit()
    
    return {"message": "Work schedule updated", "days": schedule.days}

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update user (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update_data.email is not None:
        existing = db.query(User).filter(
            User.email == update_data.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = update_data.email
    
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
    
    if update_data.expected_weekly_hours is not None:
        user.expected_weekly_hours = update_data.expected_weekly_hours
    
    if update_data.has_km_compensation is not None:
        user.has_km_compensation = update_data.has_km_compensation
    
    db.commit()
    db.refresh(user)
    
    return user