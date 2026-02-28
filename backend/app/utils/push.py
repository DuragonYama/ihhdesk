"""Web Push delivery utility using pywebpush + VAPID."""
import json
from pywebpush import webpush, WebPushException
from app.config import settings


async def send_push(endpoint: str, p256dh: str, auth: str, title: str, body: str) -> bool:
    """Send a single Web Push notification. Returns True on success."""
    payload = json.dumps({"title": title, "body": body})
    try:
        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
        return True
    except WebPushException as exc:
        print(f"Push failed [{endpoint[:50]}...]: {exc}")
        return False
    except Exception as exc:
        print(f"Push error: {exc}")
        return False
