from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import secrets
from app.database import get_db
from app.models import User, PasswordResetToken
from app.schemas import UserResponse
from app.security import verify_password, create_access_token, get_password_hash
from app.utils.email import send_email
from app.config import settings

router = APIRouter()

# Login schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint - returns JWT token"""
    
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset - sends email with reset link"""
    
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        return {"message": "If email exists, reset link has been sent"}
    
    # Generate unique token
    token = secrets.token_urlsafe(32)
    
    # Create reset token (expires in 1 hour)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    
    db.add(reset_token)
    db.commit()
    
    # Send email
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    email_body = f"""
    Hi {user.username},
    
    You requested a password reset.
    
    Click here to reset your password:
    {reset_link}
    
    This link expires in 1 hour.
    
    If you didn't request this, ignore this email.
    """
    
    await send_email(
        to_email=user.email,
        subject="Password Reset Request",
        body=email_body
    )
    
    return {"message": "If email exists, reset link has been sent"}

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using token from email"""
    
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.password_hash = get_password_hash(request.new_password)
    
    reset_token.used = True
    
    db.commit()
    
    return {"message": "Password reset successful"}