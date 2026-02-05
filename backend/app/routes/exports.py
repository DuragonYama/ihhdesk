from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from datetime import datetime
from app.database import get_db
from app.models import User
from app.dependencies import get_current_admin
from app.utils.csv_export import generate_monthly_report_csv

router = APIRouter()

@router.get("/monthly-report")
async def download_monthly_report(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Download monthly CSV report for all employees (admin only)"""
    
    # Validate month
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    # Validate year
    if year < 2020 or year > 2100:
        raise HTTPException(status_code=400, detail="Invalid year")
    
    # Generate CSV
    csv_content = generate_monthly_report_csv(db, year, month)
    
    # Create filename
    filename = f"report_{year}_{month:02d}.csv"
    
    # Return as downloadable file
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )