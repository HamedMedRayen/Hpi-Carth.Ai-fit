"""
HPI — /api/reports routes
User-facing report endpoints for reporting coaches and software bugs.
"""

from typing import Optional, Dict, Any, List
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import get_db
from routes.auth import get_current_user_id
from repositories.report_repository import ReportRepository

router = APIRouter(prefix="/reports", tags=["Reports"])


class CoachReportRequest(BaseModel):
    coach_id: int
    category: str = Field(..., min_length=2, example="Inappropriate behavior")
    description: str = Field(..., min_length=5, example="Detailed description of issue")

class BugReportRequest(BaseModel):
    category: str = Field(..., min_length=2, example="Crash")
    description: str = Field(..., min_length=5, example="UI layout breaks on mobile width")
    screenshot_url: Optional[str] = None
    app_context: Optional[str] = None


@router.post("/coach", status_code=201)
def report_coach(
    payload: CoachReportRequest,
    reporter_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, role FROM users WHERE id = %s", (payload.coach_id,))
        coach = cur.fetchone()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach user not found.")

    repo = ReportRepository(db)
    report = repo.create_coach_report(
        reporter_id=reporter_id,
        coach_id=payload.coach_id,
        category=payload.category,
        description=payload.description
    )
    return report


@router.post("/bug", status_code=201)
def report_bug(
    payload: BugReportRequest,
    reporter_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    repo = ReportRepository(db)
    report = repo.create_bug_report(
        reporter_id=reporter_id,
        category=payload.category,
        description=payload.description,
        screenshot_url=payload.screenshot_url,
        app_context=payload.app_context
    )
    return report


@router.get("/mine")
def get_my_reports(
    reporter_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    repo = ReportRepository(db)
    return repo.get_user_reports(reporter_id)
