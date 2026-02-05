from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings

async def send_email(to_email: str, subject: str, body: str):
    """Send email via SendGrid"""
    
    message = Mail(
        from_email=(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
        to_emails=to_email,
        subject=subject,
        html_content=f"<html><body><pre style='font-family: sans-serif; white-space: pre-wrap;'>{body}</pre></body></html>"
    )
    
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Email sent! Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False