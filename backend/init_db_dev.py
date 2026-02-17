from app.database import engine, SessionLocal, Base
from app.models import User
from app.security import get_password_hash  # Make sure this import exists!

def init_database():
    """Create tables and admin account"""
    
    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created!")
    
    # Add admin user
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            new_admin = User(
                username="admin",
                email="admin@company.com",
                password_hash=get_password_hash("Admin123!"),  # This line should call get_password_hash
                role="admin",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("✅ Admin account created!")
            print("   Username: admin")
            print("   Password: Admin123!")
        else:
            print("ℹ️  Admin already exists")
            
    finally:
        db.close()

if __name__ == "__main__":
    init_database()