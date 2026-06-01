# Bugfix Plan: Slow HR Clock Registration Approval

## Report

HR reports that approving a time registration takes noticeably long.

The affected UI flow is the admin `Goedkeuringen` page:

1. HR opens a pending item under `Klokregistraties`.
2. HR clicks `Goedkeuren` and confirms the approval modal.
3. The modal remains in the `Bezig...` state until the backend request finishes.

Expected behavior: once the approval has been stored, the API should respond quickly so the modal closes and the pending list refreshes. Sending the employee notification must not extend the HR wait time.

## Root Cause

The frontend correctly waits for `PATCH /api/clock/{event_id}/approve` before closing the modal:

- `admin-frontend/src/pages/Approvals.tsx`, `ClockEventCard.approveMutation`
- `admin-frontend/src/components/ApprovalModal.tsx`, confirm button state

The backend commits the status change before sending notifications, but does not return the HTTP response until notification delivery is finished:

- `backend/app/routes/clock.py`, `approve_clock_event`
  - commits `event.status = "approved"`
  - awaits SendGrid email delivery
  - loads every push subscription
  - awaits web-push delivery for every subscription sequentially
  - only then returns the approved event

The notification utilities compound the issue:

- `backend/app/utils/email.py`, `send_email`
- `backend/app/utils/push.py`, `send_push`

Both functions are declared `async`, but call synchronous third-party clients directly (`SendGridAPIClient.send()` and `webpush()`). Waiting for these calls delays the approval response and blocks the server event loop while an external service responds. A slow SendGrid request or one slow push endpoint therefore becomes visible to HR as a slow approval.

## Related Issue

`DELETE /api/clock/{event_id}` has the same behavior when HR rejects a pending clock registration: it waits for the rejection email and each push notification before returning. Fix this sibling path in the same change because it is part of the same HR clock-registration workflow and uses the same notification helpers.

Absence and calendar approval routes also await external notification delivery before returning. They are outside this narrow bugfix, but the helper change below prevents their synchronous network calls from blocking the entire server event loop. Their UI requests will still wait for delivery until a separate follow-up moves those notifications to background tasks.

## Minimal Fix

### 1. Run synchronous notification clients in a thread pool

Update `backend/app/utils/email.py`:

- Import `run_in_threadpool` from `fastapi.concurrency`.
- Keep the existing async `send_email(to_email, subject, body)` API so existing callers do not need to change.
- Replace the direct `sg.send(message)` call with:

```python
response = await run_in_threadpool(sg.send, message)
```

Update `backend/app/utils/push.py`:

- Import `run_in_threadpool` from `fastapi.concurrency`.
- Keep the existing async `send_push(endpoint, p256dh, auth, title, body)` API.
- Replace the direct `webpush(...)` call with:

```python
await run_in_threadpool(
    webpush,
    subscription_info={
        "endpoint": endpoint,
        "keys": {"p256dh": p256dh, "auth": auth},
    },
    data=payload,
    vapid_private_key=settings.VAPID_PRIVATE_KEY,
    vapid_claims={"sub": settings.VAPID_SUBJECT},
)
```

This preserves existing success/failure logging and return values while ensuring external I/O no longer blocks the FastAPI event loop.

### 2. Queue clock approval notifications after the response

Update `backend/app/routes/clock.py`:

- Import `BackgroundTasks` from `fastapi`.
- Add `background_tasks: BackgroundTasks` to `approve_clock_event`. `BackgroundTasks` is injected without a default value, so it MUST be placed **before** `request_data: dict = {}` (and the other defaulted/`Depends` parameters). Placing it after a parameter that has a default raises a Python `SyntaxError`. The resulting parameter order is: `event_id`, `background_tasks`, `request_data`, `db`, `current_user`.
- Keep the current status validation, database commit, response payload, email body, and push body unchanged.
- Keep the existing `if user and user.email:` guard around the email task and the `if user:` guard around the push tasks; only the email/push body strings (already built from primitives) are passed in.
- Replace `await send_email(...)` with `background_tasks.add_task(send_email, ...)`.
- Replace each `await send_push(...)` with `background_tasks.add_task(send_push, ...)`.
- Query the user's subscriptions before returning, then enqueue tasks using only primitive subscription values (`sub.endpoint`, `sub.p256dh`, `sub.auth`). Do not pass the request-scoped SQLAlchemy session or ORM objects into background tasks.
- Note: once these become background tasks, the surrounding `try/except` blocks no longer catch delivery errors (`add_task` does not execute the call). Delivery failures are instead caught and logged inside `send_email`/`send_push` themselves, which satisfies the "failure is logged after the response" criterion. The `try/except` blocks may remain (they now only guard body construction) or be left as-is.

The response should be returned after the database update, user lookup, subscription lookup, and task registration. Notification delivery then runs after the response has been sent.

### 3. Queue clock rejection notifications after the response

Update `backend/app/routes/clock.py`:

- Add `background_tasks: BackgroundTasks` to `delete_clock_event`. As with the approve route, it has no default value and MUST be placed **before** `request_data: dict = {}` to avoid a Python `SyntaxError`. The resulting parameter order is: `event_id`, `background_tasks`, `request_data`, `db`, `current_user`.
- In the existing pending-event admin rejection branch (`if was_pending and current_user.role == 'admin' and user and user.email:` for email, and the subscription loop for push), enqueue the rejection email and push tasks with `background_tasks.add_task(...)` instead of awaiting them. The primitive values (`event_date`, `requested_reason`, `user.email`) are already captured before `db.delete(event)`, so the enqueued tasks reference only primitives.
- Keep normal deletion semantics unchanged for employee deletes and HR direct deletes that are not pending rejections.

## Scope

Files to modify:

- `backend/app/utils/email.py`
- `backend/app/utils/push.py`
- `backend/app/routes/clock.py`

Do not change:

- frontend behavior or query invalidation
- database schema or Alembic migrations
- email or push message contents
- notification delivery semantics outside clock approval/rejection, except for moving synchronous client work off the event loop inside the shared helpers

`BackgroundTasks` is an in-process best-effort mechanism. A server restart immediately after the response can lose a queued notification. If guaranteed delivery is required later, use a persisted outbox or external queue as a separate feature.

## Verification

There is no backend test suite in the repository. Verify this change with focused manual/API checks and the existing frontend build.

## Acceptance Criteria

How to verify this task is fully and correctly implemented.
The implementation agent must check every item before calling the task done.

### Functional checks

- [ ] Approving a pending clock registration through `PATCH /api/clock/{event_id}/approve` returns after the database work and task registration; it does not await SendGrid or web-push delivery.
- [ ] After approval, the clock event has `status = "approved"` and disappears from `GET /api/clock/pending`.
- [ ] The admin approval modal closes and the pending clock-registration list refreshes promptly after confirming `Goedkeuren`.
- [ ] The approval email and each configured push notification are still attempted after the API response.
- [ ] Rejecting a pending clock registration through `DELETE /api/clock/{event_id}` returns without awaiting email or push delivery, and still removes the event.
- [ ] `send_email()` and `send_push()` retain their async signatures and execute their synchronous third-party calls through `run_in_threadpool`.

### Negative checks

- [ ] Approving a missing clock event still returns `404`.
- [ ] Approving an event that is not pending still returns `400`.
- [ ] A SendGrid failure or web-push failure is logged after the response and does not undo the stored approval or deletion.
- [ ] An employee still cannot delete another employee's clock registration.

### Regression checks

- [ ] Approval and rejection notifications retain the existing subject, body, and optional admin notes.
- [ ] Password-reset email, bulk email, batch push, scheduled push, absence notifications, and calendar notifications still call the same async helper interfaces.
- [ ] Run `python -m compileall backend/app`.
- [ ] Run `npm run build` in `admin-frontend`.

### Migration checks

- [ ] No database migration is required.
