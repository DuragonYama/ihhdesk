from sqlalchemy import Column, Integer, String, Boolean, DECIMAL, DateTime, Date, Time, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    expected_weekly_hours = Column(DECIMAL(5, 2), nullable=True)
    has_km_compensation = Column(Boolean, default=False)

    # Password reset fields
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    work_schedules = relationship("WorkSchedule", back_populates="user", cascade="all, delete-orphan")
    clock_events = relationship(
        "ClockEvent",
        back_populates="user",
        foreign_keys="ClockEvent.user_id",
        cascade="all, delete-orphan"
    )
    absences = relationship(
        "Absence",
        back_populates="user",
        foreign_keys="Absence.user_id",
        cascade="all, delete-orphan"
    )


class WorkSchedule(Base):
    __tablename__ = "work_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="work_schedules")

    __table_args__ = (
        UniqueConstraint('user_id', 'day_of_week', name='unique_user_day'),
    )


class ClockEvent(Base):
    __tablename__ = "clock_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    clock_in = Column(Time, nullable=False)
    clock_out = Column(Time, default="18:00:00")
    
    came_by_car = Column(Boolean, default=False)
    parking_cost = Column(DECIMAL(10, 2), nullable=True)
    km_driven = Column(DECIMAL(10, 2), nullable=True)

    status = Column(String, default='approved')  # 'pending' or 'approved'
    requested_reason = Column(Text, nullable=True)  # Reason for non-scheduled day

    created_at = Column(DateTime, default=datetime.utcnow)
    modified_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    modified_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="clock_events", foreign_keys=[user_id])
    
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='unique_user_date'),
    )


class Absence(Base):
    __tablename__ = "absences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True) 
    type = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, default="pending")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    user = relationship("User", back_populates="absences", foreign_keys=[user_id])
    
    __table_args__ = (
        UniqueConstraint('user_id', 'start_date', name='unique_absence_user_start_date'),
    )

class EventCategory(Base):
    __tablename__ = "event_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)

    events = relationship("CalendarEvent", back_populates="category")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("event_categories.id"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    time_start = Column(Time, nullable=True)
    time_end = Column(Time, nullable=True)
    
    visibility = Column(String, default="all")  # 'all' or 'specific'
    status = Column(String, default="approved")  # 'pending', 'approved', 'rejected'
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    category = relationship("EventCategory", back_populates="events")
    assignments = relationship("EventAssignment", back_populates="event", cascade="all, delete-orphan")


class EventAssignment(Base):
    __tablename__ = "event_assignments"
    
    event_id = Column(Integer, ForeignKey("calendar_events.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    
    event = relationship("CalendarEvent", back_populates="assignments")


class CompanyHoliday(Base):
    __tablename__ = "company_holidays"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(Date, unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)