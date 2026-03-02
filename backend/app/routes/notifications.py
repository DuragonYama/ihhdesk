from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date
import asyncio
from typing import List

from app.database import get_db
from app.models import User, WorkSchedule, Absence, PushSubscription, ScheduledNotification
from app.schemas import (
    PushSubscriptionCreate,
    BatchPushRequest,
    BatchPushResponse,
    ScheduledNotificationCreate,
    ScheduledNotificationResponse,
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
        existing.user_id = current_user.id
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


# ── Scheduled notifications CRUD (admin) ─────────────────────────────────────

@router.get("/scheduled", response_model=List[ScheduledNotificationResponse])
async def list_scheduled_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return db.query(ScheduledNotification).order_by(ScheduledNotification.created_at).all()


@router.post("/scheduled", response_model=ScheduledNotificationResponse)
async def create_scheduled_notification(
    data: ScheduledNotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    notif = ScheduledNotification(
        title=data.title,
        message=data.message,
        send_time=data.send_time,
        days_of_week=data.days_of_week,
        is_active=data.is_active,
        target_type=data.target_type,
        target_employee_ids=data.target_employee_ids,
        created_by=current_user.id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    _resync()
    return notif


@router.put("/scheduled/{notification_id}", response_model=ScheduledNotificationResponse)
async def update_scheduled_notification(
    notification_id: int,
    data: ScheduledNotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    notif = db.query(ScheduledNotification).filter(ScheduledNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    notif.title = data.title
    notif.message = data.message
    notif.send_time = data.send_time
    notif.days_of_week = data.days_of_week
    notif.is_active = data.is_active
    notif.target_type = data.target_type
    notif.target_employee_ids = data.target_employee_ids
    db.commit()
    db.refresh(notif)
    _resync()
    return notif


@router.delete("/scheduled/{notification_id}")
async def delete_scheduled_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    notif = db.query(ScheduledNotification).filter(ScheduledNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    db.delete(notif)
    db.commit()
    _resync()
    return {"message": "Herinnering verwijderd"}


@router.post("/scheduled/{notification_id}/test", response_model=BatchPushResponse)
async def test_scheduled_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Immediately send this scheduled notification (admin test)."""
    notif = db.query(ScheduledNotification).filter(ScheduledNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    return await _run_scheduled_notification(db, notif)


# ── Scheduler helpers ─────────────────────────────────────────────────────────

def _resync():
    """Resync APScheduler jobs after any CRUD change."""
    try:
        from app.scheduler import scheduler, sync_all_notifications
        sync_all_notifications(scheduler)
    except Exception:
        pass


async def _run_scheduled_notification(db: Session, notif: ScheduledNotification) -> BatchPushResponse:
    """Resolve recipients for a notification and dispatch push messages."""
    if notif.target_type == "specific_users" and notif.target_employee_ids:
        target_ids = list(notif.target_employee_ids)
    else:
        # "all_scheduled": employees scheduled for today who aren't on approved leave
        today = date.today()
        # Convert Python weekday (0=Mon) to JS weekday (0=Sun, 1=Mon, …, 6=Sat)
        today_dow_js = (today.weekday() + 1) % 7

        scheduled = db.query(User).join(WorkSchedule).filter(
            WorkSchedule.day_of_week == today_dow_js,
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
        send_push(s.endpoint, s.p256dh, s.auth, notif.title, notif.message)
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
