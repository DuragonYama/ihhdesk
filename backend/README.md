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

**For Development (with test users):**
```bash
python init_db_dev.py
```

**For Production (secure admin account):**
```bash
python init_db_prod.py
```

See [Database Initialization](#database-initialization) below for details.

5. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## Database Initialization

The backend provides two initialization scripts for different environments:

### Development: `init_db_dev.py`

**Use for:** Local development and testing

**What it does:**
- Creates database tables
- Creates test users with default passwords
- Provides immediate access for development

**Test accounts created:**
- **Admin:** username: `admin` | password: `admin123`
- **Developer:** username: `developer` | password: `dev123`
- **Employee:** username: `employee` | password: `emp123`

**Usage:**
```bash
python init_db_dev.py
```

⚠️ **WARNING:** Never use in production! Test credentials are insecure.

---

### Production: `init_db_prod.py`

**Use for:** Production deployment on servers

**What it does:**
- Creates database tables
- Prompts for secure admin credentials
- Validates password strength (min 8 chars, uppercase, lowercase, number)
- Creates single admin account
- No test users created

**Usage:**
```bash
python init_db_prod.py
```

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Confirmation required

**Example session:**
```
🔐 PRODUCTION DATABASE INITIALIZATION
=====================================

👤 Admin Account Setup
Admin username: john.doe
Admin email: john@codeofa.com
Admin password: ********
Confirm password: ********

✅ PRODUCTION DATABASE INITIALIZED SUCCESSFULLY!
```

---

### Production Domains

When deploying to production, use these domains:

- **Employee Frontend:** `https://ihh-hr.codeofa.com`
- **Admin Frontend:** `https://ihh-desk.codeofa.com`
- **Backend API:** `https://ihh-api.codeofa.com`

Update `.env` file:
```env
EMPLOYEE_FRONTEND_URL=https://ihh-hr.codeofa.com
ADMIN_FRONTEND_URL=https://ihh-desk.codeofa.com
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production setup guide.

---

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
├── init_db_dev.py        # Development database init (test users)
├── init_db_prod.py       # Production database init (secure)
└── DEPLOYMENT.md         # Production deployment guide
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
