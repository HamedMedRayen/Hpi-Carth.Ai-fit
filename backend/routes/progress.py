from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from pydantic import BaseModel
import psycopg2.extras

from datetime import datetime, timedelta

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Progress"])

class WeightHistoryRecord(BaseModel):
    date: str
    weight: float

class RepsHistoryRecord(BaseModel):
    date: str
    reps: float

class SessionHistoryRecord(BaseModel):
    date: str
    weight: float
    reps: float

@router.get("/weight-history", response_model=List[WeightHistoryRecord])
def get_weight_history(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT logged_at::text as date, weight_kg as weight
            FROM bodyweight_logs
            WHERE user_id = %s
            ORDER BY logged_at ASC
        """, (user_id,))
        results = cur.fetchall()
    return results or []

@router.get("/reps-history", response_model=List[RepsHistoryRecord])
def get_reps_history(exercise_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date as date, AVG(s.reps) as reps
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND s.exercise_id = %s
            GROUP BY w.session_date
            ORDER BY w.session_date ASC
        """, (user_id, exercise_id))
        results = cur.fetchall()
    return results or []

@router.get("/session-history", response_model=List[SessionHistoryRecord])
def get_session_history(exercise_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date as date,
                   AVG(s.weight_kg) as weight,
                   AVG(s.reps) as reps
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND s.exercise_id = %s
            GROUP BY w.session_date
            ORDER BY w.session_date ASC
        """, (user_id, exercise_id))
        results = cur.fetchall()
    return results or []

class ExerciseTrackerRecord(BaseModel):
    date: str
    value: float

@router.get("/exercise/{exercise_id}/best-set-1rm", response_model=List[ExerciseTrackerRecord])
def get_exercise_best_1rm(exercise_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date::date as date,
                   MAX(s.weight_kg * (1 + s.reps / 30.0)) as value
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND s.exercise_id = %s AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
            GROUP BY date
            ORDER BY date ASC
        """, (user_id, exercise_id))
        results = cur.fetchall()
    return [{"date": r["date"].strftime("%Y-%m-%d"), "value": r["value"]} for r in results]

@router.get("/exercise/{exercise_id}/best-set-weight", response_model=List[ExerciseTrackerRecord])
def get_exercise_max_weight(exercise_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date::date as date,
                   MAX(s.weight_kg) as value
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND s.exercise_id = %s AND s.weight_kg IS NOT NULL
            GROUP BY date
            ORDER BY date ASC
        """, (user_id, exercise_id))
        results = cur.fetchall()
    return [{"date": r["date"].strftime("%Y-%m-%d"), "value": r["value"]} for r in results]

@router.get("/exercise/{exercise_id}/volume", response_model=List[ExerciseTrackerRecord])
def get_exercise_volume(exercise_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date::date as date,
                   SUM(s.weight_kg * s.reps) as value
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND s.exercise_id = %s AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
            GROUP BY date
            ORDER BY date ASC
        """, (user_id, exercise_id))
        results = cur.fetchall()
    return [{"date": r["date"].strftime("%Y-%m-%d"), "value": r["value"]} for r in results]

@router.get("/exercise/{exercise_id}/best-set-reps", response_model=List[ExerciseTrackerRecord])
def get_exercise_best_reps(exercise_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date::date as date,
                   MAX(s.reps) as value
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND s.exercise_id = %s AND s.reps IS NOT NULL
            GROUP BY date
            ORDER BY date ASC
        """, (user_id, exercise_id))
        results = cur.fetchall()
    return [{"date": r["date"].strftime("%Y-%m-%d"), "value": r["value"]} for r in results]

class WorkoutsPerWeekRecord(BaseModel):
    week: str
    count: int

@router.get("/workouts-per-week", response_model=List[WorkoutsPerWeekRecord])
def get_workouts_per_week(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Check if user has ANY workouts at all
        cur.execute("SELECT COUNT(*) as total FROM workouts WHERE user_id = %s", (user_id,))
        total_workouts = cur.fetchone()['total']
        if total_workouts == 0:
            return []

        cur.execute("""
            SELECT DATE_TRUNC('week', session_date::date)::date AS week_start,
                   COUNT(*) AS count
            FROM workouts
            WHERE user_id = %s
              AND session_date::date >= (DATE_TRUNC('week', NOW()) - INTERVAL '11 weeks')::date
            GROUP BY week_start
            ORDER BY week_start ASC
        """, (user_id,))
        results = cur.fetchall()
        
    today = datetime.now().date()
    this_monday = today - timedelta(days=today.weekday())
    
    result_map = {r['week_start']: r['count'] for r in results}
    
    formatted = []
    for i in range(11, -1, -1):
        week_date = this_monday - timedelta(weeks=i)
        week_label = week_date.strftime("%b %d").replace(" 0", " ") # Apr 05 -> Apr 5
        formatted.append({"week": week_label, "count": result_map.get(week_date, 0)})
        
    return formatted

# --- DASHBOARD ENDPOINTS ---

@router.get("/stats")
def get_dashboard_stats(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Total volume, sessions, avg duration
        cur.execute("""
            SELECT 
                COUNT(DISTINCT w.id) as total_sessions,
                COALESCE(AVG(w.duration_sec), 0) / 60.0 as avg_duration_minutes,
                MAX(w.session_date::date) as last_session_date,
                (SELECT COALESCE(SUM(s.weight_kg * s.reps), 0)
                 FROM sets s JOIN workouts w2 ON w2.id = s.workout_id
                 WHERE w2.user_id = %s) as total_volume_kg,
                (SELECT COUNT(DISTINCT id) FROM workouts 
                 WHERE user_id = %s 
                   AND session_date::date >= DATE_TRUNC('week', NOW())::date) as weekly_sessions
            FROM workouts w
            WHERE w.user_id = %s
        """, (user_id, user_id, user_id))
        stats = cur.fetchone() or {}

        # Last session days ago
        last_date = stats.get('last_session_date')
        if last_date:
            days_ago = (datetime.now().date() - last_date).days
        else:
            days_ago = 0

        # Current streak (Union workouts and rest_days)
        cur.execute("""
            SELECT DISTINCT date FROM (
                SELECT session_date::date as date FROM workouts WHERE user_id = %s
                UNION
                SELECT date FROM rest_days WHERE user_id = %s
            ) activity
            ORDER BY date DESC
        """, (user_id, user_id))
        dates = [r['date'] for r in cur.fetchall()]
        
        current_streak = 0
        if dates:
            today = datetime.now().date()
            # A streak is active if the last activity was today or yesterday
            if (today - dates[0]).days <= 1:
                current_streak = 1
                for i in range(1, len(dates)):
                    if (dates[i-1] - dates[i]).days == 1:
                        current_streak += 1
                    else:
                        break

    return {
        "total_volume_kg": stats.get('total_volume_kg', 0),
        "total_sessions": stats.get('total_sessions', 0),
        "weekly_sessions": stats.get('weekly_sessions', 0),
        "last_session_days_ago": days_ago,
        "avg_duration_minutes": round(stats.get('avg_duration_minutes', 0)),
        "current_streak_days": current_streak
    }

@router.get("/volume-history")
def get_volume_history(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date::date as date, COALESCE(SUM(s.weight_kg * s.reps), 0) as volume
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND w.session_date::date >= (NOW() - INTERVAL '60 days')::date
            GROUP BY date ORDER BY date ASC
        """, (user_id,))
        results = cur.fetchall()
        
    formatted = []
    for r in results:
        formatted.append({
            "date": r['date'].strftime("%d %b"),
            "volume": r['volume']
        })
    return formatted

@router.get("/weekly-volume")
def get_weekly_volume(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Get volume for current week and previous week
        cur.execute("""
            SELECT DATE_TRUNC('week', w.session_date::date)::date as week_start,
                   COALESCE(SUM(s.weight_kg * s.reps), 0) as volume
            FROM workouts w
            JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND w.session_date::date >= DATE_TRUNC('week', NOW() - INTERVAL '1 week')::date
            GROUP BY week_start ORDER BY week_start ASC
        """, (user_id,))
        results = cur.fetchall()

    last_week_vol = 0
    this_week_vol = 0
    today = datetime.now().date()
    this_week_start = today - timedelta(days=today.weekday())
    
    for r in results:
        if r['week_start'] == this_week_start:
            this_week_vol = r['volume']
        else:
            last_week_vol = r['volume']

    return {
        "last_week": {"label": "Last Week", "volume": last_week_vol},
        "this_week": {"label": "This Week", "volume": this_week_vol}
    }

@router.get("/training-split")
def get_training_split(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT e.muscle_group, COALESCE(SUM(s.weight_kg * s.reps), 0) as volume
            FROM sets s
            JOIN exercises e ON e.id = s.exercise_id
            JOIN workouts w ON w.id = s.workout_id
            WHERE w.user_id = %s AND w.session_date::date >= (NOW() - INTERVAL '30 days')::date
            GROUP BY e.muscle_group ORDER BY volume DESC
        """, (user_id,))
        results = cur.fetchall()

    return [{"name": r['muscle_group'] or "other", "value": r['volume']} for r in results]

@router.get("/activity-map")
def get_activity_map(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT w.session_date::date as date, 
                   COUNT(DISTINCT w.id) as sessions, 
                   COALESCE(SUM(s.weight_kg * s.reps), 0) as volume
            FROM workouts w
            LEFT JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s AND w.session_date::date >= (NOW() - INTERVAL '84 days')::date
            GROUP BY date ORDER BY date ASC
        """, (user_id,))
        results = cur.fetchall()
        
    formatted = []
    for r in results:
        formatted.append({
            "date": r['date'].strftime("%Y-%m-%d"),
            "sessions": r['sessions'],
            "volume": r['volume']
        })
    return formatted

@router.get("/streak")
def get_streak(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT DISTINCT date FROM (
                SELECT session_date::date as date FROM workouts WHERE user_id = %s
                UNION
                SELECT date FROM rest_days WHERE user_id = %s
            ) activity
            ORDER BY date DESC
        """, (user_id, user_id))
        dates = [r['date'] for r in cur.fetchall()]

    current_streak = 0
    best_streak = 0
    
    if dates:
        # Calculate current streak
        today = datetime.now().date()
        if (today - dates[0]).days <= 1:
            current_streak = 1
            for i in range(1, len(dates)):
                if (dates[i-1] - dates[i]).days == 1:
                    current_streak += 1
                else:
                    break

        # Calculate best streak
        temp_streak = 1
        for i in range(1, len(dates)):
            if (dates[i-1] - dates[i]).days == 1:
                temp_streak += 1
            else:
                if temp_streak > best_streak:
                    best_streak = temp_streak
                temp_streak = 1
        if temp_streak > best_streak:
            best_streak = temp_streak

    # Calculate week array [bool x 7] (Mon-Sun)
    today = datetime.now().date()
    # Find this week's monday
    monday = today - timedelta(days=today.weekday())
    week_dates = [(monday + timedelta(days=i)) for i in range(7)]
    week_bools = [(d in dates) for d in week_dates]

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "week": week_bools
    }

@router.post("/rest-day")
def log_rest_day(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        today = datetime.now().date()
        # Upsert rest day for today
        cur.execute("""
            INSERT INTO rest_days (user_id, date)
            VALUES (%s, %s)
            ON CONFLICT (user_id, date) DO NOTHING
            RETURNING id
        """, (user_id, today))
        db.commit()
    return {"status": "success", "message": "Rest day logged"}
