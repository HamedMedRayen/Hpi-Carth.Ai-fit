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
from models.metric import (
    PCAResult, GBDTResult, DashboardSummary, AnalyticsRequest
)
from repositories.metric_repo import MetricRepository
from repositories.workout_repo import WorkoutRepository
from repositories.user_repo import UserRepository
from services.analytics_service import (
    run_pca, compute_volume_progression, compute_dashboard_summary
)
from services.ml_service import run_gbdt_prediction

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


@router.get("/users/{user_id}/pca", response_model=PCAResult,
            summary="PCA on workout metrics")
def pca_analysis(
    user_id: int,
    n_components: int = Query(2, ge=2, le=5),
    current_user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    _check_user(user_id, db)
    metric_repo = MetricRepository(db)
    rows = metric_repo.get_feature_matrix_rows(user_id)
    if len(rows) < 3:
        raise HTTPException(
            status_code=422,
            detail="Need at least 3 workout sessions for PCA."
        )
    return run_pca(rows, n_components=n_components)


@router.get("/users/{user_id}/gbdt", response_model=GBDTResult,
            summary="GBDT volume prediction")
def gbdt_prediction(
    user_id: int,
    n_estimators: int = Query(50, ge=5, le=200),
    max_depth: int = Query(3, ge=1, le=6),
    learning_rate: float = Query(0.1, ge=0.01, le=0.5),
    current_user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    _check_user(user_id, db)
    metric_repo = MetricRepository(db)
    rows = metric_repo.get_by_user(user_id, limit=500)
    if len(rows) < 5:
        raise HTTPException(
            status_code=422,
            detail="Need at least 5 workout sessions for GBDT."
        )
    return run_gbdt_prediction(
        rows,
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
    )


@router.post("/run", summary="Run full analytics pipeline for a user")
def run_analytics(
    payload: AnalyticsRequest,
    current_user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """
    Trigger PCA + GBDT + dashboard in one call.
    Persists updated PCA scores to metrics table.
    """
    user_id = payload.user_id
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    _check_user(user_id, db)

    metric_repo = MetricRepository(db)
    workout_repo = WorkoutRepository(db)

    rows = metric_repo.get_feature_matrix_rows(user_id)

    pca_result = run_pca(rows, n_components=payload.n_pca_components)

    # Persist PC scores back to metrics
    all_metrics = metric_repo.get_by_user(user_id, limit=500)
    for i, point in enumerate(pca_result.get("points", [])):
        if i < len(all_metrics):
            metric_repo.update_pca(
                all_metrics[i]["id"],
                point.get("pc1", 0.0),
                point.get("pc2", 0.0),
            )

    gbdt_result = run_gbdt_prediction(
        metric_repo.get_by_user(user_id, limit=500),
        n_estimators=50,
    )

    # Persist predictions
    predictions = gbdt_result.get("predictions", [])
    all_metrics_fresh = metric_repo.get_by_user(user_id, limit=500)
    for i, pred in enumerate(predictions):
        if i < len(all_metrics_fresh):
            metric_repo.update_prediction(all_metrics_fresh[i]["id"], pred)

    db.commit()

    pr_rows = workout_repo.get_personal_records(user_id)
    timeseries = workout_repo.get_volume_timeseries(user_id)
    
    # Get active injury count
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) as count FROM injury_logs WHERE user_id = %s AND status = 'active'", (user_id,))
        active_injuries_count = cur.fetchone()["count"]

    dashboard = compute_dashboard_summary(
        metric_repo.get_by_user(user_id, limit=500), pr_rows, timeseries, active_injuries_count
    )
    dashboard["ai_insight"] = sync_hpi_insight_notification(user_id, db, dashboard["ai_insight"])

    return {
        "status": "ok",
        "pca": pca_result,
        "gbdt": gbdt_result,
        "dashboard": dashboard,
    }


def _check_user(user_id: int, db: psycopg2.extensions.connection):
    repo = UserRepository(db)
    if not repo.get_by_id(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")
