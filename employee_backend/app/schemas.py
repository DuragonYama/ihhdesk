from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import time, date

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