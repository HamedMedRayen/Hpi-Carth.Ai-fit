"""
HPI — /api/workouts routes (v2 — includes DELETE)
"""
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id
from models.workout import (
    WorkoutCreate, WorkoutRead, WorkoutDetail,
    WorkoutSummary, ExerciseRead, PersonalRecordRead
)
from repositories.workout_repo import WorkoutRepository
from repositories.metric_repo import MetricRepository

router = APIRouter(prefix="/workouts", tags=["Workouts"])


def _repo(db=Depends(get_db)):
    return WorkoutRepository(db)


# ── Exercises ──────────────────────────────────────────────────
@router.get("/exercises", response_model=List[ExerciseRead])
def list_exercises(repo=Depends(_repo)):
    return repo.list_exercises()


# ── PRs ────────────────────────────────────────────────────────
@router.get("/users/{user_id}/prs", response_model=List[PersonalRecordRead])
def get_prs(
    user_id: int,
    exercise: Optional[str] = Query(None),
    current_user_id: int = Depends(get_current_user_id),
    repo=Depends(_repo)
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return repo.get_personal_records(user_id, exercise_name=exercise)


# ── Workout list ───────────────────────────────────────────────
@router.get("/users/{user_id}", response_model=List[WorkoutSummary])
def list_workouts(
    user_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user_id: int = Depends(get_current_user_id),
    repo=Depends(_repo),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return repo.get_workout_summaries(user_id, limit=limit)


# ── Workout Templates (must be before /{workout_id} to avoid int cast 422) ──
@router.get("/templates")
def get_templates(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Get user's saved workout templates"""
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT id, name, exercises, created_at FROM workout_templates
        WHERE user_id = %s ORDER BY created_at DESC
    """, (user_id,))
    return cur.fetchall() or []


@router.post("/templates")
def save_template(payload: dict, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Save a workout template with name and exercises"""
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Template name required")
    import json
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO workout_templates (user_id, name, exercises)
        VALUES (%s, %s, %s)
        RETURNING id, name, exercises, created_at
    """, (user_id, payload["name"], json.dumps(payload.get("exercises", []))))
    db.commit()
    return cur.fetchone()


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Delete a workout template"""
    cur = db.cursor()
    cur.execute("DELETE FROM workout_templates WHERE id = %s AND user_id = %s", (template_id, user_id))
    db.commit()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Template not found")


# ── Workout detail ─────────────────────────────────────────────
@router.get("/{workout_id}", response_model=WorkoutDetail)
def get_workout(workout_id: int, current_user_id: int = Depends(get_current_user_id), repo=Depends(_repo)):
    workout = repo.get_workout_detail(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail=f"Workout {workout_id} not found.")
    if workout["user_id"] != current_user_id:
        # Allow access if requesting user is the athlete's active coach
        db = repo.db
        with db.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM coach_relationships 
                WHERE coach_id = %s AND athlete_id = %s AND status = 'active'
            """, (current_user_id, workout["user_id"]))
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Forbidden")
    return workout


# ── Create ─────────────────────────────────────────────────────
@router.post("/", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(payload: WorkoutCreate, current_user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    if payload.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        from services.ingestion_service import aggregate_session
        from data_engine.engine import MathUtils

        repo        = WorkoutRepository(db)
        metric_repo = MetricRepository(db)

        workout = repo.create({
            "user_id": payload.user_id,
            "workout_name": payload.workout_name,
            "session_date": payload.session_date,
            "duration_sec": payload.duration_sec,
            "notes": payload.notes,
        })
        workout_id = workout["id"]

        set_records = []
        for s in payload.sets:
            ex_id   = repo.get_or_create_exercise(s.exercise_name)
            one_rm  = MathUtils.epley_1rm(s.weight_kg, s.reps) if s.weight_kg > 0 and s.reps > 0 else 0.0
            volume  = s.weight_kg * s.reps
            set_data = {
                "workout_id": workout_id,
                "exercise_id": ex_id,
                "exercise_name": s.exercise_name,
                "set_order": s.set_order,
                "weight_kg": s.weight_kg,
                "reps": s.reps,
                "rpe": s.rpe,
                "distance_m": s.distance_m,
                "duration_s": s.duration_s,
                "one_rm_est": round(one_rm, 2),
                "volume_load": round(volume, 2),
            }
            repo.insert_set(set_data)
            set_records.append(set_data)

        agg = aggregate_session(set_records)
        metric_repo.create({
            "user_id": payload.user_id,
            "workout_id": workout_id,
            "session_date": payload.session_date,
            **agg,
        })
        return workout
    except Exception as e:
        print(f"[ERROR] create_workout: {e}")
        raise


# ── DELETE ─────────────────────────────────────────────────────
@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(workout_id: int, current_user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """
    Delete a workout and all its sets, metrics, and PRs via CASCADE.
    Returns 204 No Content on success.
    """
    repo = WorkoutRepository(db)
    wk = repo.get_by_id(workout_id)
    if not wk:
        raise HTTPException(status_code=404, detail=f"Workout {workout_id} not found.")
    if wk["user_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # CASCADE deletes sets + metrics automatically (FK ON DELETE CASCADE)
    deleted = repo.delete(workout_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Delete failed.")


# ── Volume timeseries ──────────────────────────────────────────
@router.get("/users/{user_id}/volume")
def volume_timeseries(
    user_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str]   = Query(None),
    current_user_id: int = Depends(get_current_user_id),
    repo=Depends(_repo),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from services.analytics_service import compute_volume_progression
    rows = repo.get_volume_timeseries(user_id, start_date, end_date)
    return compute_volume_progression(rows)


@router.get("/users/{user_id}/exercise/{exercise_name}")
def exercise_progress(user_id: int, exercise_name: str, current_user_id: int = Depends(get_current_user_id), repo=Depends(_repo)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = repo.get_exercise_progress(user_id, exercise_name)
    if not rows:
        raise HTTPException(status_code=404, detail=f"No data for '{exercise_name}'")
    return {
        "exercise_name": exercise_name,
        "dates":         [r["date"] for r in rows],
        "max_1rm":       [round(float(r.get("max_1rm", 0) or 0), 2) for r in rows],
        "max_weight":    [round(float(r.get("max_weight", 0) or 0), 2) for r in rows],
        "total_volume":  [round(float(r.get("total_volume", 0) or 0), 2) for r in rows],
    }


@router.get("/users/{user_id}/heatmap")
def heatmap(user_id: int, current_user_id: int = Depends(get_current_user_id), repo=Depends(_repo)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows    = repo.get_heatmap_data(user_id)
    max_val = max((float(r.get("value", 0) or 0) for r in rows), default=1.0)
    return {
        "entries": [{"date": r["date"], "value": round(float(r.get("value", 0) or 0), 2),
                     "workout_name": r.get("workout_name", "")} for r in rows],
        "max_value":        round(max_val, 2),
        "total_days_active": len(rows),
    }




# ── Body Weight Logging ────────────────────────────────────────
@router.post("/bodyweight")
def log_bodyweight(payload: dict, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Log user's body weight for today"""
    if not payload.get("weight_kg") or payload["weight_kg"] <= 0:
        raise HTTPException(status_code=400, detail="Valid weight_kg required")
    
    from datetime import datetime
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    today_date = datetime.now().date()
    
    # Upsert: update if exists, insert if not
    cur.execute("""
        INSERT INTO bodyweight_logs (user_id, logged_at, weight_kg)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, logged_at) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
        RETURNING id, weight_kg, logged_at
    """, (user_id, today_date, payload["weight_kg"]))
    db.commit()
    return cur.fetchone()


@router.get("/bodyweight")
def get_bodyweight_log(user_id: int = Depends(get_current_user_id), days: int = Query(30), db=Depends(get_db)):
    """Get user's body weight logs for past N days"""
    from datetime import datetime, timedelta
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    cur.execute("""
        SELECT logged_at, weight_kg FROM bodyweight_logs
        WHERE user_id = %s AND logged_at >= %s
        ORDER BY logged_at DESC
    """, (user_id, start_date))
    return cur.fetchall() or []


# ── Analytics ──────────────────────────────────────────────────
@router.get("/analytics/muscle-heatmap")
def muscle_heatmap(user_id: int = Depends(get_current_user_id), days: int = Query(7), db=Depends(get_db)):
    """Get muscle group volume by heatmap for past N days"""
    from datetime import datetime, timedelta
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    cur.execute("""
        SELECT e.muscle_group, SUM(s.volume_load) as total_volume
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        JOIN exercises e ON s.exercise_id = e.id
        WHERE w.user_id = %s AND w.session_date::date >= %s
        GROUP BY e.muscle_group
        ORDER BY total_volume DESC
    """, (user_id, start_date))
    
    return [{
        "muscle_group": r["muscle_group"] or "Other",
        "total_volume": round(float(r["total_volume"] or 0), 2)
    } for r in cur.fetchall()]


@router.get("/analytics/monthly-volume")
def monthly_volume(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Get monthly volume breakdown by muscle group (last 6 months)"""
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("""
        SELECT 
            TO_CHAR(w.session_date, 'YYYY-MM') as month,
            e.muscle_group,
            SUM(s.volume_load) as total_volume
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        JOIN exercises e ON s.exercise_id = e.id
        WHERE w.user_id = %s AND w.session_date >= NOW() - INTERVAL '6 months'
        GROUP BY month, muscle_group
        ORDER BY month DESC, total_volume DESC
    """, (user_id,))
    
    return [{
        "month": r["month"],
        "muscle_group": r["muscle_group"] or "Other",
        "total_volume": round(float(r["total_volume"] or 0), 2)
    } for r in cur.fetchall()]
