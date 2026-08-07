"""
HPI — /api/analytics routes
PCA, GBDT predictions, and dashboard summary.
"""

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id
from models.metric import DashboardSummary
from repositories.metric_repo import MetricRepository
from repositories.workout_repo import WorkoutRepository
from repositories.user_repo import UserRepository
from services.analytics_service import compute_dashboard_summary

from datetime import date

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def sync_hpi_insight_notification(user_id: int, db: psycopg2.extensions.connection, generated_insight: str) -> str:
    """
    Checks if an AI notification of type 'hpi_insight' has already been dispatched to the user today.
    If it exists, return that message (ensuring consistency).
    If it doesn't exist, create a new one with type='hpi_insight', title='HPI Insight', message=generated_insight,
    save it to the database, and return generated_insight.
    """
    today_str = date.today().isoformat()
    try:
        with db.cursor() as cur:
            # Look for an hpi_insight notification for this user created today
            cur.execute("""
                SELECT message FROM notifications 
                WHERE user_id = %s 
                  AND type = 'hpi_insight' 
                  AND created_at::date = %s 
                ORDER BY id DESC LIMIT 1
            """, (user_id, today_str))
            row = cur.fetchone()
            if row:
                return row["message"]
            
            # If not found, insert a new one
            cur.execute("""
                INSERT INTO notifications (user_id, sender_id, type, title, message, data, is_read, created_at)
                VALUES (%s, NULL, 'hpi_insight', 'HPI Insight', %s, NULL, FALSE, NOW())
                RETURNING message
            """, (user_id, generated_insight))
            db.commit()
            return generated_insight
    except Exception as e:
        # Avoid crashing if notifications table fails
        db.rollback()
        import logging
        logging.getLogger("hpi").error(f"Error in sync_hpi_insight_notification: {e}")
        return generated_insight


@router.get("/users/{user_id}/dashboard", response_model=DashboardSummary,
            summary="Full dashboard summary")
def dashboard(
    user_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    _check_user(user_id, db)
    metric_repo = MetricRepository(db)
    workout_repo = WorkoutRepository(db)

    metric_rows = metric_repo.get_by_user(user_id, limit=500)
    pr_rows = workout_repo.get_personal_records(user_id)
    timeseries = workout_repo.get_volume_timeseries(user_id)

    # Get active injury count
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) as count FROM injury_logs WHERE user_id = %s AND status = 'active'", (user_id,))
        active_injuries_count = cur.fetchone()["count"]

    summary = compute_dashboard_summary(metric_rows, pr_rows, timeseries, active_injuries_count)
    summary["ai_insight"] = sync_hpi_insight_notification(user_id, db, summary["ai_insight"])
    return summary


def _check_user(user_id: int, db: psycopg2.extensions.connection):
    repo = UserRepository(db)
    if not repo.get_by_id(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")

