#!/usr/bin/env python3
"""
Production Database Initialization Script

This script creates a secure admin account for production use.
It prompts for credentials and uses proper password hashing.

Usage:
    python init_db_prod.py
"""

import sys
import os
from getpass import getpass

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models import Base, User
from app.security import get_password_hash


def validate_email(email: str) -> bool:
    """Basic email validation"""
    return '@' in email and '.' in email.split('@')[1]


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password meets requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, ""


def init_production_db():
    """Initialize database with secure admin account"""

    print("=" * 60)
    print("🔐 PRODUCTION DATABASE INITIALIZATION")
    print("=" * 60)
    print()
    print("This script will create the database and an admin account.")
    print("Please provide secure credentials for the admin user.")
    print()

    # Create all tables
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
    print()

    # Get admin credentials
    print("👤 Admin Account Setup")
    print("-" * 60)

    # Username
    while True:
        username = input("Admin username: ").strip()
        if username:
            break
        print("❌ Username cannot be empty")

    # Email
    while True:
        email = input("Admin email: ").strip()
        if validate_email(email):
            break
        print("❌ Invalid email format")

    # Password with validation
    while True:
        password = getpass("Admin password (min 8 chars, uppercase, lowercase, number): ")
        is_valid, error_msg = validate_password(password)

        if not is_valid:
            print(f"❌ {error_msg}")
            continue

        password_confirm = getpass("Confirm password: ")

        if password != password_confirm:
            print("❌ Passwords do not match. Please try again.")
            continue

        break

    # Create admin user
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.username == username).first()
        if existing_admin:
            print()
            print(f"⚠️  Warning: User '{username}' already exists!")
            response = input("Do you want to update the password? (yes/no): ").strip().lower()

            if response == 'yes':
                existing_admin.password_hash = get_password_hash(password)
                existing_admin.email = email
                db.commit()
                print()
                print("✅ Admin password updated successfully!")
            else:
                print()
                print("❌ Database initialization cancelled.")
                return
        else:
            # Create new admin
            admin = User(
                username=username,
                email=email,
                password_hash=get_password_hash(password),
                role='admin',
                is_active=True,
                expected_weekly_hours=0,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

            print()
            print("=" * 60)
            print("✅ PRODUCTION DATABASE INITIALIZED SUCCESSFULLY!")
            print("=" * 60)
            print()
            print(f"Admin Account Created:")
            print(f"  Username: {admin.username}")
            print(f"  Email:    {admin.email}")
            print(f"  Role:     {admin.role}")
            print()
            print("🔒 Security Reminders:")
            print("  - Store credentials securely")
            print("  - Enable HTTPS in production")
            print("  - Set strong JWT_SECRET in .env")
            print("  - Configure CORS for production domains")
            print("  - Enable rate limiting")
            print()
            print("🌐 Production Domains:")
            print("  - Employee: https://ihh-hr.codeofa.com")
            print("  - Admin:    https://ihh-desk.codeofa.com")
            print("  - API:      https://ihh-api.codeofa.com")
            print()
            print("📝 Next Steps:")
            print("  1. Update .env with production settings")
            print("  2. Set EMPLOYEE_FRONTEND_URL=https://ihh-hr.codeofa.com")
            print("  3. Set ADMIN_FRONTEND_URL=https://ihh-desk.codeofa.com")
            print("  4. Configure Cloudflare tunnel for API")
            print("  5. Set up systemd service")
            print()
            print("See DEPLOYMENT.md for detailed instructions.")
            print()

    except Exception as e:
        db.rollback()
        print()
        print("=" * 60)
        print("❌ ERROR: Database initialization failed!")
        print("=" * 60)
        print()
        print(f"Error: {str(e)}")
        print()
        print("Please check:")
        print("  - Database connection settings in .env")
        print("  - File permissions")
        print("  - Disk space")
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    try:
        init_production_db()
    except KeyboardInterrupt:
        print()
        print()
        print("❌ Database initialization cancelled by user.")
        sys.exit(1)
