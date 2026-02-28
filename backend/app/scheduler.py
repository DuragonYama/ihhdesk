"""APScheduler setup for the daily clock-in reminder."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


def schedule_reminder(sched: AsyncIOScheduler, send_time: str):
    """Add (or replace) the daily reminder cron job using 'HH:MM' send_time."""
    try:
        hour, minute = send_time.split(":")
    except ValueError:
        hour, minute = "7", "30"

    sched.add_job(
        _reminder_job,
        CronTrigger(hour=int(hour), minute=int(minute)),
        id="daily_reminder",
        replace_existing=True,
    )


async def _reminder_job():
    """AsyncIOScheduler calls this coroutine directly — no sync wrapper needed."""
    from app.database import get_db
    from app.models import DailyReminderConfig
    from app.routes.notifications import _run_reminder_job

    db = next(get_db())
    try:
        config = db.query(DailyReminderConfig).first()
        if not config or not config.is_enabled:
            return
        await _run_reminder_job(db, config)
    finally:
        db.close()
