from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import time, date, datetime

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    
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

class ClockEventResponse(BaseModel):
    id: int
    user_id: int
    date: date
    clock_in: time
    clock_out: time
    came_by_car: bool
    parking_cost: Optional[float]
    km_driven: Optional[float]
    
    class Config:
        from_attributes = True

class ClockEventUpdate(BaseModel):
    clock_in: Optional[time] = None
    clock_out: Optional[time] = None
    came_by_car: Optional[bool] = None
    parking_cost: Optional[float] = None
    km_driven: Optional[float] = None

# Absence Schemas
class AbsenceRequest(BaseModel):
    date: date
    type: str  # 'sick', 'personal', 'vacation'
    reason: str

class AbsenceResponse(BaseModel):
    id: int
    user_id: int
    date: date
    type: str
    reason: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[int]
    
    class Config:
        from_attributes = True

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

# Add this after CalendarEventCreate
class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[date] = None
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    visibility: Optional[str] = None
    assigned_user_ids: Optional[List[int]] = None