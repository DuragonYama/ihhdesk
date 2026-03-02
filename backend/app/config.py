from pathlib import Path
from pydantic_settings import BaseSettings

_env_path = str(Path(__file__).parent.parent / ".env")

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/employees.db"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080
    APP_NAME: str = "Employee Management System"

    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = ""
    SENDGRID_FROM_NAME: str = "OFA email bot"

    # Frontend URLs for password reset and other redirects
    EMPLOYEE_FRONTEND_URL: str = "http://localhost:5173"
    ADMIN_FRONTEND_URL: str = "http://localhost:5174"

    # VAPID keys for Web Push notifications (generate once, store in .env)
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@example.com"

    # Legacy - kept for backward compatibility
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = _env_path

settings = Settings()