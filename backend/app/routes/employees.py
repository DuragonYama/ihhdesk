from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
from app.database import get_db
from app.models import User, WorkSchedule, ClockEvent, Absence
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/team-today")
async def get_team_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team status for today - simple version like admin dashboard"""

    today = datetime.now().date()

    print(f"[TEAM-TODAY] ========== START ==========")
    print(f"[TEAM-TODAY] Today is {today}")

    # Get all active employees
    all_users = db.query(User).filter(
        User.is_active == True,
        User.role == 'employee'
    ).all()

    print(f"[TEAM-TODAY] Found {len(all_users)} active employees")

    team = []

    for user in all_users:
        # Check if clocked in today
        clock_event = db.query(ClockEvent).filter(
            ClockEvent.user_id == user.id,
            ClockEvent.date == today,
            ClockEvent.status == 'approved'
        ).first()

        # Check if on leave today
        absence = db.query(Absence).filter(
            Absence.user_id == user.id,
            Absence.status == 'approved',
            Absence.start_date <= today
        ).filter(
            (Absence.end_date >= today) | (Absence.end_date == None)
        ).first()

        # Determine status - simple logic
        if clock_event:
            status = 'present'
            extra_info = {
                'clock_in': clock_event.clock_in.strftime('%H:%M'),
                'clock_out': clock_event.clock_out.strftime('%H:%M') if clock_event.clock_out else None,
                'work_from_home': clock_event.work_from_home or False
            }
            print(f"[TEAM-TODAY] {user.username} is PRESENT (clocked in at {extra_info['clock_in']})")
        elif absence:
            status = absence.type  # 'sick', 'vacation', 'personal'
            extra_info = {
                'reason': absence.reason
            }
            print(f"[TEAM-TODAY] {user.username} is on {status.upper()} leave")
        else:
            # Check if scheduled to work today
            # WorkSchedule stores JS convention (0=Sun, 1=Mon, ..., 6=Sat)
            # Python weekday() uses 0=Mon, 6=Sun, so convert: (py + 1) % 7
            today_js = (today.weekday() + 1) % 7
            schedule_today = db.query(WorkSchedule).filter(
                WorkSchedule.user_id == user.id,
                WorkSchedule.day_of_week == today_js
            ).first()
            if not schedule_today:
                print(f"[TEAM-TODAY] {user.username} not scheduled today (skipping)")
                continue
            # Scheduled but not clocked in
            status = 'not_clocked'
            extra_info = {}
            print(f"[TEAM-TODAY] {user.username} is SCHEDULED but not clocked in")

        team.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'status': status,
            **extra_info
        })

    print(f"[TEAM-TODAY] ========== RESULT: {len(team)} team members shown ==========")

    return {
        'date': str(today),
        'team': team
    }
