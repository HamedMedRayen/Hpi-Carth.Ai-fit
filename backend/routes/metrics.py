"""
HPI — /api/metrics routes
"""

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id
from models.metric import MetricRead
from repositories.metric_repo import MetricRepository

router = APIRouter(prefix="/metrics", tags=["Metrics"])


def _repo(db: psycopg2.extensions.connection = Depends(get_db)) -> MetricRepository:
    return MetricRepository(db)


@router.get("/users/{user_id}", response_model=List[MetricRead],
            summary="List metrics for a user")
def list_metrics(
    user_id: int,
    limit: int = Query(200, ge=1, le=2000),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user_id: int = Depends(get_current_user_id),
    repo: MetricRepository = Depends(_repo),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return repo.get_by_user(user_id, limit=limit,
                            start_date=start_date, end_date=end_date)


@router.get("/workout/{workout_id}", response_model=MetricRead,
            summary="Get metrics for a specific workout")
def get_workout_metric(workout_id: int, current_user_id: int = Depends(get_current_user_id), repo: MetricRepository = Depends(_repo)):
    metric = repo.get_by_workout(workout_id)
    if not metric:
        raise HTTPException(status_code=404,
                            detail=f"No metric for workout {workout_id}.")
    if metric["user_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return metric


@router.get("/{metric_id}", response_model=MetricRead, summary="Get metric by ID")
def get_metric(metric_id: int, current_user_id: int = Depends(get_current_user_id), repo: MetricRepository = Depends(_repo)):
    metric = repo.get_by_id(metric_id)
    if not metric:
        raise HTTPException(status_code=404,
                            detail=f"Metric {metric_id} not found.")
    if metric["user_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return metric


@router.get("/users/{user_id}/feature-matrix",
            summary="Raw feature matrix for ML (JSON)")
def feature_matrix(user_id: int, current_user_id: int = Depends(get_current_user_id), repo: MetricRepository = Depends(_repo)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = repo.get_feature_matrix_rows(user_id)
    if not rows:
        raise HTTPException(status_code=404,
                            detail=f"No metrics found for user {user_id}.")
    return {
        "user_id": user_id,
        "n_samples": len(rows),
        "features": ["total_volume", "total_sets", "total_reps",
                     "avg_intensity", "max_1rm", "fatigue_index", "inol"],
        "rows": rows,
    }
