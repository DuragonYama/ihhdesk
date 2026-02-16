from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models import User
from app.dependencies import get_current_user, get_current_admin
from app.utils.calculations import calculate_user_balance

router = APIRouter()

@router.get("/balance/me")
async def get_my_balance(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get my hours balance"""
    
    # Default to current month if not specified
    if not start_date or not end_date:
        today = datetime.now().date()
        start_date = today.replace(day=1)
        # Get last day of month
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    balance = calculate_user_balance(db, current_user.id, start_date, end_date)
    return balance

@router.get("/balance/user/{user_id}")
async def get_user_balance(
    user_id: int,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user's hours balance (admin only)"""
    
    # Default to current month if not specified
    if not start_date or not end_date:
        today = datetime.now().date()
        start_date = today.replace(day=1)
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    balance = calculate_user_balance(db, user_id, start_date, end_date)
    return balance

@router.get("/balance/all")
async def get_all_balances(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get hours balance for all employees (admin only)"""
    
    # Default to current month
    if not start_date or not end_date:
        today = datetime.now().date()
        start_date = today.replace(day=1)
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    # Get all active employees
    employees = db.query(User).filter(
        User.role == 'employee',
        User.is_active == True
    ).all()
    
    balances = []
    for employee in employees:
        balance = calculate_user_balance(db, employee.id, start_date, end_date)
        balances.append(balance)
    
    return {
        'period_start': str(start_date),
        'period_end': str(end_date),
        'employees': balances
    }

@router.get("/today-status")
async def get_today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get today's employee status overview (admin only)"""
    
    from app.models import ClockEvent, Absence, WorkSchedule
    
    today = datetime.now().date()
    
    # Get all active employees
    employees = db.query(User).filter(
        User.role == 'employee',
        User.is_active == True
    ).all()
    
    # Get today's clock events
    clock_events = {
        ce.user_id: ce
        for ce in db.query(ClockEvent).filter(
            ClockEvent.date == today
        ).all()
    }
    
    # Get active absences covering today
    active_absences = db.query(Absence).filter(
        Absence.status == 'approved',
        Absence.start_date <= today
    ).all()
    
    absence_map = {}
    for absence in active_absences:
        # Check if absence covers today
        if absence.end_date is None or absence.end_date >= today:
            absence_map[absence.user_id] = {
                'type': absence.type,
                'start_date': str(absence.start_date),
                'end_date': str(absence.end_date) if absence.end_date else None,
                'reason': absence.reason
            }
    
    # Get work schedules
    work_schedules = {}
    for ws in db.query(WorkSchedule).all():
        if ws.user_id not in work_schedules:
            work_schedules[ws.user_id] = []
        work_schedules[ws.user_id].append(ws.day_of_week)
    
    # Categorize employees
    clocked_in = []
    on_leave = []
    expected_missing = []

    today_weekday = today.weekday()  # Python: 0=Monday

    for employee in employees:
        user_id = employee.id

        # Check if on leave
        if user_id in absence_map:
            on_leave.append({
                'user_id': user_id,
                'username': employee.username,
                'email': employee.email,
                'absence_type': absence_map[user_id]['type'],
                'start_date': absence_map[user_id]['start_date'],
                'end_date': absence_map[user_id]['end_date'],
                'reason': absence_map[user_id]['reason']
            })
            continue

        # Check if clocked in
        if user_id in clock_events:
            ce = clock_events[user_id]
            clocked_in.append({
                'user_id': user_id,
                'username': employee.username,
                'email': employee.email,
                'clock_in': str(ce.clock_in),
                'clock_out': str(ce.clock_out),
                'came_by_car': ce.came_by_car
            })
            continue

        # Check if expected today
        # Get JavaScript day numbers (0=Sunday, 1=Monday, etc.)
        js_scheduled_days = work_schedules.get(user_id, [])

        # Convert to Python day numbers (0=Monday, 1=Tuesday, etc.)
        py_scheduled_days = [(js_day - 1) % 7 for js_day in js_scheduled_days]

        print(f"[CONVERSION] User {employee.username}: JS days: {js_scheduled_days} → Python days: {py_scheduled_days}, Today Python weekday: {today_weekday}")

        if today_weekday in py_scheduled_days:
            expected_missing.append({
                'user_id': user_id,
                'username': employee.username,
                'email': employee.email
            })
    
    return {
        'date': str(today),
        'stats': {
            'total_employees': len(employees),
            'clocked_in': len(clocked_in),
            'on_leave': len(on_leave),
            'expected_missing': len(expected_missing)
        },
        'clocked_in': clocked_in,
        'on_leave': on_leave,
        'expected_missing': expected_missing
    }