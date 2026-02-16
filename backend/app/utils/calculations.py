from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models import User, WorkSchedule, ClockEvent, Absence, CompanyHoliday

def calculate_user_balance(
    db: Session,
    user_id: int,
    start_date: date,
    end_date: date
) -> Dict:
    """
    Calculate hours balance for a user in given period.
    
    Returns detailed breakdown of extra hours, missing hours, and balance.
    Implements sick day continuation logic.
    """
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != 'employee':
        return {
            'error': 'User not found or not an employee',
            'extra_hours': 0,
            'missing_hours': 0,
            'balance': 0
        }

    scheduled_days_records = db.query(WorkSchedule).filter(
        WorkSchedule.user_id == user_id
    ).all()
    # These are JavaScript day numbers (0=Sunday, 1=Monday, etc.)
    js_scheduled_days = {ws.day_of_week for ws in scheduled_days_records}

    # Convert to Python day numbers (0=Monday, 1=Tuesday, etc.)
    # Formula: (js_day - 1) % 7
    scheduled_days = {(js_day - 1) % 7 for js_day in js_scheduled_days}

    print(f"[CONVERSION] calculate_user_balance user_id={user_id}: JS days: {js_scheduled_days} → Python days: {scheduled_days}")

    if not scheduled_days or not user.expected_weekly_hours:
        return {
            'error': 'No work schedule or expected hours set',
            'extra_hours': 0,
            'missing_hours': 0,
            'balance': 0
        }

    hours_per_day = float(user.expected_weekly_hours) / len(scheduled_days)

    clock_events = {
        ce.date: ce
        for ce in db.query(ClockEvent).filter(
            ClockEvent.user_id == user_id,
            ClockEvent.date >= start_date,
            ClockEvent.date <= end_date
        ).all()
    }

    absence_records = db.query(Absence).filter(
        Absence.user_id == user_id,
        Absence.status == 'approved'
    ).all()
    
    absence_dates = {}
    for absence in absence_records:

        actual_end = absence.end_date if absence.end_date else end_date

        if absence.start_date > end_date or actual_end < start_date:
            continue

        current = max(absence.start_date, start_date)
        final = min(actual_end, end_date)
        
        while current <= final:
            absence_dates[current] = absence.type
            current += timedelta(days=1)
    
    holidays = {
        h.date
        for h in db.query(CompanyHoliday).filter(
            CompanyHoliday.date >= start_date,
            CompanyHoliday.date <= end_date
        ).all()
    }

    extra_hours = 0.0
    missing_hours = 0.0
    total_parking = 0.0
    total_km = 0.0
    total_hours_worked = 0.0  # Track actual hours worked
    details = []

    # Check if there's an ongoing sick absence from before the period
    last_sick_date = None
    for absence in absence_records:
        if absence.type in ['sick', 'personal']:
            # If absence started before period and extends into it
            if absence.start_date < start_date:
                actual_end = absence.end_date if absence.end_date else end_date
                if actual_end >= start_date:
                    # Find the last scheduled sick day before period starts
                    check_date = absence.start_date
                    temp_last = None
                    while check_date < start_date:
                        if check_date.weekday() in scheduled_days and check_date not in holidays:
                            temp_last = check_date
                        check_date += timedelta(days=1)
                    if temp_last:
                        last_sick_date = temp_last
                        break
    
    current_date = start_date
    while current_date <= end_date:
        day_of_week = current_date.weekday()
        is_holiday = current_date in holidays
        is_scheduled = day_of_week in scheduled_days
        clock_event = clock_events.get(current_date)
        absence_type = absence_dates.get(current_date)

        if is_holiday:
            if clock_event:
                clock_in_dt = datetime.combine(current_date, clock_event.clock_in)
                clock_out_dt = datetime.combine(current_date, clock_event.clock_out)
                hours_worked = (clock_out_dt - clock_in_dt).total_seconds() / 3600

                total_hours_worked += hours_worked  # Track actual work
                extra_hours += hours_worked

                if clock_event.parking_cost:
                    total_parking += float(clock_event.parking_cost)
                if clock_event.km_driven:
                    total_km += float(clock_event.km_driven)
                
                details.append({
                    'date': str(current_date),
                    'type': 'company_holiday_worked',
                    'hours_worked': round(hours_worked, 2),
                    'hours_expected': 0,
                    'balance_change': round(hours_worked, 2),
                    'note': 'Worked on company holiday'
                })
            else:
                details.append({
                    'date': str(current_date),
                    'type': 'company_holiday',
                    'hours_worked': 0,
                    'hours_expected': 0,
                    'balance_change': 0,
                    'note': 'Company holiday'
                })
            
            current_date += timedelta(days=1)
            continue

        if absence_type == 'vacation':
            details.append({
                'date': str(current_date),
                'type': 'vacation',
                'hours_worked': 0,
                'hours_expected': hours_per_day if is_scheduled else 0,
                'balance_change': 0
            })
            current_date += timedelta(days=1)
            continue

        hours_worked = 0.0
        if clock_event:
            clock_in_dt = datetime.combine(current_date, clock_event.clock_in)
            clock_out_dt = datetime.combine(current_date, clock_event.clock_out)
            hours_worked = (clock_out_dt - clock_in_dt).total_seconds() / 3600

            total_hours_worked += hours_worked  # Track actual work

            if clock_event.parking_cost:
                total_parking += float(clock_event.parking_cost)
            if clock_event.km_driven:
                total_km += float(clock_event.km_driven)
        
        if is_scheduled:
            if absence_type in ['sick', 'personal']:
                is_continuation = False
                
                if last_sick_date:
                    check_date = last_sick_date + timedelta(days=1)
                    while check_date < current_date:
                        if check_date.weekday() not in scheduled_days or check_date in holidays:
                            check_date += timedelta(days=1)
                            continue
                        break
                    else:
                        is_continuation = True
                
                if is_continuation:
                    # Continuation of sick period - no penalty
                    details.append({
                        'date': str(current_date),
                        'type': f'{absence_type}_continuation',
                        'hours_worked': 0,
                        'hours_expected': hours_per_day,
                        'balance_change': 0,
                        'note': 'Paid sick day (continuation)'
                    })
                else:
                    # First sick day - counts as missing
                    missing_hours += hours_per_day
                    details.append({
                        'date': str(current_date),
                        'type': f'{absence_type}_first',
                        'hours_worked': 0,
                        'hours_expected': hours_per_day,
                        'balance_change': -hours_per_day,
                        'note': 'Unpaid sick day (first)'
                    })
                
                last_sick_date = current_date
            
            elif hours_worked < hours_per_day:
                # Worked less than expected (including not working at all)
                deficit = hours_per_day - hours_worked
                missing_hours += deficit
                details.append({
                    'date': str(current_date),
                    'type': 'scheduled_deficit',
                    'hours_worked': round(hours_worked, 2),
                    'hours_expected': round(hours_per_day, 2),
                    'balance_change': round(-deficit, 2)
                })
                last_sick_date = None  # Reset sick streak
            
            elif hours_worked > hours_per_day:
                surplus = hours_worked - hours_per_day
                extra_hours += surplus
                details.append({
                    'date': str(current_date),
                    'type': 'overtime',
                    'hours_worked': round(hours_worked, 2),
                    'hours_expected': round(hours_per_day, 2),
                    'balance_change': round(surplus, 2)
                })
                last_sick_date = None  # Reset sick streak
            
            else:
                details.append({
                    'date': str(current_date),
                    'type': 'on_schedule',
                    'hours_worked': round(hours_worked, 2),
                    'hours_expected': round(hours_per_day, 2),
                    'balance_change': 0
                })
                last_sick_date = None  # Reset sick streak
        
        else:
            if hours_worked > 0:
                extra_hours += hours_worked
                details.append({
                    'date': str(current_date),
                    'type': 'extra_day',
                    'hours_worked': round(hours_worked, 2),
                    'hours_expected': 0,
                    'balance_change': round(hours_worked, 2)
                })
            else:
                details.append({
                    'date': str(current_date),
                    'type': 'off_day',
                    'hours_worked': 0,
                    'hours_expected': 0,
                    'balance_change': 0
                })
            
            # Don't reset sick streak on non-scheduled days
        
        current_date += timedelta(days=1)
    
    return {
        'user_id': user_id,
        'username': user.username,
        'period_start': str(start_date),
        'period_end': str(end_date),
        'expected_weekly_hours': float(user.expected_weekly_hours),
        'hours_per_scheduled_day': round(hours_per_day, 2),
        'scheduled_days': sorted(list(scheduled_days)),
        'total_hours_worked': round(total_hours_worked, 2),  # Actual hours from clock events
        'extra_hours': round(extra_hours, 2),
        'missing_hours': round(missing_hours, 2),
        'balance': round(extra_hours - missing_hours, 2),
        'total_parking': round(total_parking, 2),
        'total_km': round(total_km, 2),
        'details': details
    }