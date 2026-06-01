---

## TASK-bugfix-slow-clock-approval — 2026-06-01

**What was implemented:**
- Moved synchronous SendGrid `sg.send()` call off the event loop via `run_in_threadpool` in `backend/app/utils/email.py`
- Moved synchronous `webpush()` call off the event loop via `run_in_threadpool` in `backend/app/utils/push.py`
- Changed `approve_clock_event` in `backend/app/routes/clock.py` to enqueue email and push notifications via `BackgroundTasks` instead of awaiting them inline
- Changed `delete_clock_event` in `backend/app/routes/clock.py` to enqueue rejection email and push notifications via `BackgroundTasks` instead of awaiting them inline

**Acceptance criteria results:**
- [x] PASS — Approve returns after DB work + task registration, does not await delivery
- [x] PASS — Approved event has status="approved", disappears from pending
- [x] PASS — Modal closes and list refreshes promptly
- [x] PASS — Email and push notifications still attempted after response
- [x] PASS — Rejection returns without awaiting delivery, still removes event
- [x] PASS — `send_email()` and `send_push()` retain async signatures, use `run_in_threadpool`
- [x] PASS — Approving missing event returns 404
- [x] PASS — Approving non-pending event returns 400
- [x] PASS — SendGrid/web-push failure logged after response, does not undo stored action
- [x] PASS — Employee cannot delete another employee's registration
- [x] PASS — Notification subject/body/admin-notes unchanged
- [x] PASS — Password-reset, bulk email, batch push, scheduled push, absence/calendar notifications still call same helper interfaces
- [x] PASS — `python -m compileall backend/app` passes
- [x] PASS — `npm run build` in admin-frontend passes
- [x] PASS — No database migration required

**Deviations from TASK file:**
- None — implementation followed the plan exactly

**Files touched not in TASK file:**
- None — only the three files specified in the task were modified

**Decisions made during implementation:**
- Kept existing try/except blocks around notification body construction as permitted by the plan; changed except messages from "Failed to send ..." to "Failed to build ..." / "Failed to prepare ..." to reflect they now guard only construction, not delivery
- Used `background_tasks.add_task(send_email, ...)` with keyword arguments for clarity, matching the `send_email` function signature directly

**Needs follow-up:**
- Absence and calendar approval routes still await notification delivery inline — a future task should move those to background tasks as well
