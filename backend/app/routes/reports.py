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