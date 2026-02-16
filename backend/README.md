# HR System Backend

FastAPI-based backend for employee management system.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize database:
```bash
# Apply all migrations
alembic upgrade head

# Create admin user
python init_db.py
```

5. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## Database Migrations

This project uses Alembic for database migrations.

### Initial Setup
```bash
# Migrations are already created, just apply them
alembic upgrade head
```

### Creating New Migrations
When you modify models in `app/models.py`:
```bash
# Generate migration automatically
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration file in alembic/versions/

# Apply the migration
alembic upgrade head
```

### Rollback
```bash
# Rollback last migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision_id>
```

### Check Current Version
```bash
alembic current
```

### Migration History
```bash
alembic history
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── alembic/              # Database migrations
│   └── versions/         # Migration files
├── app/
│   ├── routes/           # API endpoints
│   ├── models.py         # Database models
│   ├── schemas.py        # Pydantic schemas
│   ├── database.py       # Database connection
│   ├── security.py       # Authentication
│   └── utils/            # Utility functions
├── alembic.ini           # Alembic configuration
├── requirements.txt      # Python dependencies
└── init_db.py           # Database initialization script
```

## Development Workflow

1. Make changes to models in `app/models.py`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review the generated migration file
4. Apply migration: `alembic upgrade head`
5. Commit both model changes AND migration file to git

## Benefits of Alembic

- ✅ Version controlled migrations
- ✅ Team members can sync database easily
- ✅ Production deployments are consistent
- ✅ Can rollback if needed
- ✅ Migration history is tracked
- ✅ Auto-generates migrations from model changes
