import csv
from io import StringIO
from datetime import date
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models import User
from app.utils.calculations import calculate_user_balance

def generate_monthly_report_csv(db: Session, year: int, month: int) -> str:
    """
    Generate CSV report for all employees for a given month.
    Returns CSV as string.
    """
    
    # Calculate date range for the month
    start_date = date(year, month, 1)
    
    # Get last day of month
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    from datetime import timedelta
    end_date = end_date - timedelta(days=1)
    
    # Get all active employees
    employees = db.query(User).filter(
        User.role == 'employee',
        User.is_active == True
    ).all()
    
    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Employee',
        'Email',
        'Expected Weekly Hours',
        'Days Worked',
        'Total Hours Worked',
        'Expected Hours',
        'Extra Hours',
        'Missing Hours',
        'Balance',
        'Total Parking (€)',
        'Total KM',
        'KM Compensation (€0.23/km)'
    ])
    
    # Write employee data
    for employee in employees:
        balance = calculate_user_balance(db, employee.id, start_date, end_date)
        
        # Skip employees with errors
        if 'error' in balance:
            continue
        
        # Count days actually worked
        days_worked = sum(
            1 for detail in balance['details'] 
            if detail.get('hours_worked', 0) > 0
        )
        
        # Calculate total hours worked
        total_hours = sum(
            detail.get('hours_worked', 0) 
            for detail in balance['details']
        )
        
        # Calculate expected hours (scheduled days × hours per day)
        expected_hours = sum(
            detail.get('hours_expected', 0) 
            for detail in balance['details']
        )
        
        # Calculate KM compensation
        km_compensation = balance['total_km'] * 0.23
        
        writer.writerow([
            employee.username,
            employee.email,
            balance['expected_weekly_hours'],
            days_worked,
            round(total_hours, 2),
            round(expected_hours, 2),
            balance['extra_hours'],
            balance['missing_hours'],
            balance['balance'],
            balance['total_parking'],
            balance['total_km'],
            round(km_compensation, 2)
        ])
    
    # Get CSV string
    csv_content = output.getvalue()
    output.close()
    
    return csv_content