"""APScheduler setup for multiple scheduled push notifications."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


def _js_days_to_aps(js_days: list) -> str:
    """Convert JS-style day list [0=Sun,...,6=Sat] to APScheduler cron string [0=Mon,...,6=Sun]."""
    # JS 0(Sun) -> APS 6, JS 1(Mon) -> APS 0, ..., JS 6(Sat) -> APS 5
    aps_days = [(d - 1) % 7 for d in js_days]
    return ",".join(str(d) for d in sorted(set(aps_days)))


def schedule_notification(sched: AsyncIOScheduler, notification_id: int, send_time: str, days_of_week: list):
    """Add (or replace) the cron job for a single ScheduledNotification."""
    try:
        hour, minute = send_time.split(":")
    except ValueError:
        hour, minute = "7", "30"

    day_str = _js_days_to_aps(days_of_week) if days_of_week else "*"

    sched.add_job(
        _notification_job,
        CronTrigger(day_of_week=day_str, hour=int(hour), minute=int(minute)),
        id=f"scheduled_notification_{notification_id}",
        args=[notification_id],
        replace_existing=True,
    )


def remove_notification_job(sched: AsyncIOScheduler, notification_id: int):
    """Remove a scheduled notification job if it exists."""
    job_id = f"scheduled_notification_{notification_id}"
    if sched.get_job(job_id):
        sched.remove_job(job_id)


def sync_all_notifications(sched: AsyncIOScheduler):
    """Sync APScheduler jobs with all active ScheduledNotification records in the DB."""
    from app.database import get_db
    from app.models import ScheduledNotification

    # Remove all existing notification jobs
    for job in list(sched.get_jobs()):
        if job.id.startswith("scheduled_notification_"):
            sched.remove_job(job.id)

    db = next(get_db())
    try:
        notifications = db.query(ScheduledNotification).filter(
            ScheduledNotification.is_active == True
        ).all()

        for notif in notifications:
            if notif.days_of_week:
                schedule_notification(sched, notif.id, notif.send_time, notif.days_of_week)
    finally:
        db.close()


# Kept for backward compatibility — main.py is being updated to use sync_all_notifications
def schedule_reminder(sched: AsyncIOScheduler, send_time: str):
    """Deprecated: no-op shim. Use sync_all_notifications instead."""
    pass


async def _notification_job(notification_id: int):
    """APScheduler calls this coroutine for each scheduled notification."""
    from app.database import get_db
    from app.models import ScheduledNotification
    from app.routes.notifications import _run_scheduled_notification

    db = next(get_db())
    try:
        notif = db.query(ScheduledNotification).filter(
            ScheduledNotification.id == notification_id,
            ScheduledNotification.is_active == True,
        ).first()
        if not notif:
            return
        await _run_scheduled_notification(db, notif)
    finally:
        db.close()
