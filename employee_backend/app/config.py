from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./data/employees.db"
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # App
    APP_NAME: str = "Employee Management System"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()