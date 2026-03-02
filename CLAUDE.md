# IHH Desk Architecture

## Project Overview
Employee management system with two frontends (Admin and Employee) and a FastAPI backend. Manages clock-ins, absences, calendar events, timesheets, and settings.

## Tech Stack
### Backend
- **Framework:** FastAPI
- **Database:** PostgreSQL + SQLAlchemy ORM
- **Migrations:** Alembic (`alembic/`)
- **Key Dependencies:** apscheduler (for cron tasks), aiosmtplib (email), Passlib + JWT (Auth)
- **Structure:**
  - `app/main.py`: App entry point and lifespan setup (scheduler startup).
  - `app/routes/`: Route controllers defined here (auth, users, clock, absences, calendar, reports, exports, email, employees, notifications).
  - `app/models.py`: SQLAlchemy models (e.g. DailyReminderConfig, etc.).
  - `app/schemas.py`: Pydantic models for validation.
  - `app/scheduler.py`: Background tasks via APScheduler.
  - `app/utils/`: calculations.py, csv_export.py, email.py, push.py.

### Frontend (Admin)
- **Framework:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **State/Data:** React Query (TanStack V5), base config via Axios
- **Routing:** React Router DOM V7
- **UI Icons:** Lucide-React
- **Key Structure:**
  - `pages/`: AbsenceManagement, Approvals, Calendar, Dashboard, Email, Notifications, Reports, Timesheet, Users, etc.
  - `components/`: Modals (Approval, BulkAbsence, EditAbsence, EditCalendarEvent, EditClockEvent) and Layout.
  - `contexts/`: AuthContext.

### Frontend (Employee)
- **Framework:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **State/Data:** Zustand (authStore.ts), React Query (TanStack V5)
- **Routing:** React Router DOM V7
- **UI Icons:** Lucide-React
- **Key Structure:**
  - `pages/`: Absences, Balance, Calendar, Clock, Home, Profile, RequestAbsence, SuggestEvent, etc.
  - `components/`: Layout, LoadingSpinner, ProtectedRoute.
  - `store/`: authStore.ts.
  - `contexts/`: AuthContext.

## Core Features
1. **Clock System:** Tracks clock-in/out events.
2. **Absences:** Employees request absences, admins approve/deny or bulk edit.
3. **Calendar:** View team calendar and suggest events.
4. **Timesheets & Reports:** Detailed time reporting and CSV exports.
5. **Notifications & Emails:** Daily reminders (configured by admins), email delivery.
6. **User Management:** Role-based access (admin/employee), force logout capability.
