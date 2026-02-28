from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, users, clock, absences, calendar, reports, exports, email, employees
from app.routes import notifications
from app.config import settings
from app.scheduler import scheduler, schedule_reminder


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load reminder config and start scheduler
    from app.database import get_db
    from app.models import DailyReminderConfig
    db = next(get_db())
    try:
        config = db.query(DailyReminderConfig).first()
        send_time = config.send_time if config else "07:30"
        schedule_reminder(scheduler, send_time)
        scheduler.start()
    finally:
        db.close()
    yield
    # Shutdown
    scheduler.shutdown()


app = FastAPI(title="Employee Management API", lifespan=lifespan)

# CORS origins are configured via .env file
# Change EMPLOYEE_FRONTEND_URL and ADMIN_FRONTEND_URL in .env when deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.EMPLOYEE_FRONTEND_URL,  # Employee frontend
        settings.ADMIN_FRONTEND_URL,     # Admin frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with prefixes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clock.router, prefix="/api/clock", tags=["Clock"])
app.include_router(absences.router, prefix="/api/absences", tags=["Absences"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(exports.router, prefix="/api/exports", tags=["Exports"])
app.include_router(email.router, prefix="/api/email", tags=["Email"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/")
async def root():
    return {"message": "Employee Management API", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}