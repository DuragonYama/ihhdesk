from pydantic import BaseModel, EmailStr
from decimal import Decimal
from typing import Optional, List
from datetime import time, date, datetime

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    expected_weekly_hours: Optional[Decimal] = None 
    has_km_compensation: Optional[bool] = None 
    work_days: Optional[List[int]] = None

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str  # 'admin' or 'employee'
    expected_weekly_hours: Optional[float] = None
    has_km_compensation: bool = False

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    expected_weekly_hours: Optional[float] = None
    has_km_compensation: Optional[bool] = None

class WorkScheduleCreate(BaseModel):
    days: List[int]  # [0, 2, 4] = Monday, Wednesday, Friday

class WorkScheduleResponse(BaseModel):
    days: List[int]

class UserDetail(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    expected_weekly_hours: Optional[float]
    has_km_compensation: bool
    work_days: List[int]  # Days they work
    
    class Config:
        from_attributes = True

class ClockInRequest(BaseModel):
    came_by_car: bool = False
    parking_cost: Optional[float] = None
    km_driven: Optional[float] = None
    reason: Optional[str] = None  # For non-scheduled days

class ClockEventResponse(BaseModel):
    id: int
    user_id: int
    date: date
    clock_in: time
    clock_out: time
    came_by_car: bool
    parking_cost: Optional[float]
    km_driven: Optional[float]
    status: Optional[str] = 'approved'
    requested_reason: Optional[str] = None

    class Config:
        from_attributes = True

class ClockEventUpdate(BaseModel):
    clock_in: Optional[time] = None
    clock_out: Optional[time] = None
    came_by_car: Optional[bool] = None
    parking_cost: Optional[float] = None
    km_driven: Optional[float] = None

class CreateClockEventRequest(BaseModel):
    date: str  # YYYY-MM-DD
    clock_in: str  # HH:MM:SS
    clock_out: str  # HH:MM:SS
    came_by_car: bool
    parking_cost: Optional[float] = None
    km_driven: Optional[float] = None
    reason: Optional[str] = None  # For non-scheduled days

# Absence Schemas
class AbsenceRequest(BaseModel):
    start_date: date
    end_date: Optional[date] = None  # Multi-day support
    type: str  # 'sick', 'personal', 'vacation'
    reason: str

class AbsenceResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None  # ADDED
    start_date: date
    end_date: Optional[date] = None
    type: str
    reason: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[int]
    
    class Config:
        from_attributes = True

class ApproveAbsenceRequest(BaseModel):  # ADDED
    admin_notes: Optional[str] = None

class RejectAbsenceRequest(BaseModel):  # ADDED
    admin_notes: Optional[str] = None

class UpdateAbsenceRequest(BaseModel):
    start_date: Optional[date] = None
    reason: Optional[str] = None

class AdminCreateAbsenceRequest(BaseModel):
    user_id: int
    start_date: date
    type: str  # 'sick', 'personal', 'vacation'
    reason: str
    auto_approve: bool = False

# Event Category Schemas
class EventCategoryCreate(BaseModel):
    name: str
    color: str = "#3b82f6"  # Default blue

class EventCategoryResponse(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Calendar Event Schemas
class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: date
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    visibility: str = "all"  # 'all' or 'specific'
    assigned_user_ids: Optional[List[int]] = None  # Only if visibility='specific'

class CalendarEventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category_id: Optional[int]
    date: date
    time_start: Optional[time]
    time_end: Optional[time]
    visibility: str
    status: str
    created_by: int
    username: Optional[str] = None  # For pending events
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[int]

    class Config:
        from_attributes = True

class CalendarEventDetail(CalendarEventResponse):
    assigned_users: List[int]  # List of user IDs if specific visibility

# Company Holiday Schemas
class CompanyHolidayCreate(BaseModel):
    name: str
    date: date

class CompanyHolidayResponse(BaseModel):
    id: int
    name: str
    date: date
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[date] = None
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    visibility: Optional[str] = None
    assigned_user_ids: Optional[List[int]] = None

# Email Schemas
class BulkEmailRequest(BaseModel):
    employee_ids: List[int]
    external_emails: List[EmailStr]
    subject: str
    message: str

class BulkEmailResponse(BaseModel):
    total_recipients: int
    successful_count: int
    failed_emails: List[str]
    success: bool