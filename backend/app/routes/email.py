from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import BulkEmailRequest, BulkEmailResponse
from app.dependencies import get_current_admin
from app.utils.email import send_email
import asyncio

router = APIRouter()


@router.post("/send", response_model=BulkEmailResponse)
async def send_bulk_email(
    email_data: BulkEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Send bulk email to employees and external recipients (admin only)"""

    # Collect recipient emails
    recipient_emails = []

    # Get active employees by IDs
    if email_data.employee_ids:
        employees = db.query(User).filter(
            User.id.in_(email_data.employee_ids),
            User.is_active == True
        ).all()
        recipient_emails.extend([emp.email for emp in employees])

    # Add external emails
    recipient_emails.extend(email_data.external_emails)

    # Remove duplicates while preserving order
    seen = set()
    unique_recipients = []
    for email in recipient_emails:
        if email.lower() not in seen:
            seen.add(email.lower())
            unique_recipients.append(email)

    # Validate at least one recipient
    if not unique_recipients:
        raise HTTPException(
            status_code=400,
            detail="At least one recipient is required"
        )

    # Send emails concurrently
    tasks = [
        send_email(to_email=email, subject=email_data.subject, body=email_data.message)
        for email in unique_recipients
    ]

    results = await asyncio.gather(*tasks, return_exceptions=False)

    # Track successes and failures
    successful_count = sum(1 for result in results if result is True)
    failed_emails = [
        unique_recipients[i]
        for i, result in enumerate(results)
        if result is not True
    ]

    return BulkEmailResponse(
        total_recipients=len(unique_recipients),
        successful_count=successful_count,
        failed_emails=failed_emails,
        success=successful_count > 0
    )
