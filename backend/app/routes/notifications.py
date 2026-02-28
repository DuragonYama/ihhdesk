from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date
import asyncio

from app.database import get_db
from app.models import User, WorkSchedule, Absence, PushSubscription, DailyReminderConfig
from app.schemas import (
    PushSubscriptionCreate,
    BatchPushRequest,
    BatchPushResponse,
    DailyReminderConfigRequest,
    DailyReminderConfigResponse,
)
from app.dependencies import get_current_admin, get_current_user
from app.utils.push import send_push
from app.config import settings

router = APIRouter()


# ── VAPID public key (no auth — needed before login to subscribe) ─────────────

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Return the VAPID public key so the frontend can subscribe."""
    return {"public_key": settings.VAPID_PUBLIC_KEY}


# ── Subscription management (employee frontend) ───────────────────────────────

@router.post("/subscribe")
async def subscribe(
    sub: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or refresh a push subscription for the current user."""
    print(f"[push] subscribe: user={current_user.id} ({current_user.username}), endpoint={sub.endpoint[:60]}...")
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == sub.endpoint
    ).first()
    if existing:
        existing.p256dh = sub.p256dh
        existing.auth = sub.auth
        existing.user_id = current_user.id  # re-associate if needed
        print(f"[push] updated existing subscription for user {current_user.id}")
    else:
        db.add(PushSubscription(
            user_id=current_user.id,
            endpoint=sub.endpoint,
            p256dh=sub.p256dh,
            auth=sub.auth,
        ))
        print(f"[push] new subscription stored for user {current_user.id}")
    db.commit()
    total = db.query(PushSubscription).count()
    print(f"[push] total subscriptions in DB: {total}")
    return {"message": "Subscribed"}


@router.delete("/subscribe")
async def unsubscribe(
    sub: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a push subscription."""
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == sub.endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"message": "Unsubscribed"}


# ── Batch send (admin) ────────────────────────────────────────────────────────

@router.post("/send", response_model=BatchPushResponse)
async def send_batch_notification(
    data: BatchPushRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Send a push notification to selected employees (admin only)."""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id.in_(data.employee_ids)
    ).all()

    if not subscriptions:
        raise HTTPException(
            status_code=400,
            detail="Geen push-abonnementen gevonden voor de geselecteerde medewerkers. "
                   "Medewerkers moeten eerst notificaties accepteren in de app."
        )

    tasks = [
        send_push(s.endpoint, s.p256dh, s.auth, data.title, data.message)
        for s in subscriptions
    ]
    results = await asyncio.gather(*tasks)

    successful = sum(1 for r in results if r)
    failed = [subscriptions[i].endpoint for i, r in enumerate(results) if not r]

    return BatchPushResponse(
        total_recipients=len(subscriptions),
        successful_count=successful,
        failed_endpoints=failed,
        success=successful > 0,
    )


# ── Daily reminder config (admin) ─────────────────────────────────────────────

@router.get("/reminder", response_model=DailyReminderConfigResponse)
async def get_reminder_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    config = db.query(DailyReminderConfig).first()
    if not config:
        return DailyReminderConfigResponse(
            is_enabled=False,
            send_time="07:30",
            title="Vergeet niet in te klokken!",
            message="Goedemorgen! Vergeet niet in te klokken vandaag.",
            updated_at=None,
        )
    return config


@router.put("/reminder", response_model=DailyReminderConfigResponse)
async def update_reminder_config(
    data: DailyReminderConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    config = db.query(DailyReminderConfig).first()
    if not config:
        config = DailyReminderConfig()
        db.add(config)
    config.is_enabled = data.is_enabled
    config.send_time = data.send_time
    config.title = data.title
    config.message = data.message
    config.updated_by = current_user.id
    db.commit()
    db.refresh(config)
    _reschedule(config.send_time)
    return config


@router.post("/reminder/test", response_model=BatchPushResponse)
async def test_reminder(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Immediately send the reminder to today's scheduled employees (admin test)."""
    config = db.query(DailyReminderConfig).first()
    if not config:
        raise HTTPException(status_code=400, detail="Herinnering nog niet geconfigureerd")
    return await _run_reminder_job(db, config)


# ── Scheduler helpers ─────────────────────────────────────────────────────────

def _reschedule(send_time: str):
    try:
        from app.scheduler import scheduler, schedule_reminder
        schedule_reminder(scheduler, send_time)
    except Exception:
        pass


async def _run_reminder_job(db: Session, config: DailyReminderConfig) -> BatchPushResponse:
    today = date.today()
    today_dow = today.weekday()

    scheduled = db.query(User).join(WorkSchedule).filter(
        WorkSchedule.day_of_week == today_dow,
        User.is_active == True,
        User.role == "employee",
    ).all()

    absent_ids = {
        row.user_id
        for row in db.query(Absence).filter(
            Absence.status == "approved",
            Absence.start_date <= today,
            or_(Absence.end_date >= today, Absence.end_date == None),
        ).all()
    }

    target_ids = [u.id for u in scheduled if u.id not in absent_ids]

    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id.in_(target_ids)
    ).all()

    if not subscriptions:
        return BatchPushResponse(
            total_recipients=0,
            successful_count=0,
            failed_endpoints=[],
            success=True,
        )

    tasks = [
        send_push(s.endpoint, s.p256dh, s.auth, config.title, config.message)
        for s in subscriptions
    ]
    results = await asyncio.gather(*tasks)

    successful = sum(1 for r in results if r)
    failed = [subscriptions[i].endpoint for i, r in enumerate(results) if not r]

    return BatchPushResponse(
        total_recipients=len(subscriptions),
        successful_count=successful,
        failed_endpoints=failed,
        success=successful > 0,
    )
