"""
HPI — /api/exercises routes
Browse exercises by category, equipment, muscle, search.
Serves 1324 dataset exercises + user custom exercises.
"""
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db, exercise_urls
from routes.auth import get_current_user, get_current_user_id

router = APIRouter(prefix="/exercises", tags=["Exercises"])


# ── Pydantic models ───────────────────────────────────────────

class CustomExerciseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    body_part: str = Field(..., description="Body part / category name")
    primary_muscles: Optional[List[str]] = Field(default_factory=list)
    equipment: Optional[str] = Field(default="")


# ── Routes ────────────────────────────────────────────────────

@router.get("/body-parts")
def list_body_parts(db: psycopg2.extensions.connection = Depends(get_db)):
    """Legacy endpoint — returns distinct categories as body parts."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT category as name, COUNT(*) as exercise_count
            FROM exercises
            WHERE category IS NOT NULL AND category != ''
            AND (is_custom = TRUE OR image_path IS NOT NULL OR gif_path IS NOT NULL OR gif_url IS NOT NULL)
            GROUP BY category
            ORDER BY category
        """)
        rows = cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/categories")
def get_categories(db: psycopg2.extensions.connection = Depends(get_db)):
    """Get all exercise categories with counts — for body map filter chips."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT category, COUNT(*) as count
            FROM exercises
            WHERE is_custom = FALSE AND category IS NOT NULL AND category != ''
            AND (image_path IS NOT NULL OR gif_path IS NOT NULL OR gif_url IS NOT NULL)
            GROUP BY category
            ORDER BY category
        """)
        rows = cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/")
def list_exercises(
    body_part: Optional[str] = Query(None, description="Filter by category (e.g., chest, back, waist)"),
    equipment: Optional[str] = Query(None, description="Filter by equipment"),
    muscle: Optional[str] = Query(None, description="Filter by muscle_group or target"),
    search: Optional[str] = Query(None, description="Search by exercise name"),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: psycopg2.extensions.connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get exercises with combined filters (category + equipment + muscle + search)."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = "SELECT * FROM exercises WHERE 1=1 AND (is_custom = TRUE OR image_path IS NOT NULL OR gif_path IS NOT NULL OR gif_url IS NOT NULL)"
        params = []

        if body_part:
            query += " AND category ILIKE %s"
            params.append(body_part)
        if equipment:
            query += " AND equipment ILIKE %s"
            params.append(equipment)
        if muscle:
            query += " AND (muscle_group ILIKE %s OR target ILIKE %s)"
            params.extend([muscle, muscle])
        if search:
            query += " AND name ILIKE %s"
            params.append(f"%{search}%")

        query += " ORDER BY name LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, params)
        rows = cur.fetchall()

    return [exercise_urls(dict(r)) for r in rows]


@router.post("/custom")
def create_custom(
    payload: CustomExerciseRequest,
    user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """Create a custom exercise for the current user."""
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO exercises
                   (name, category, equipment, muscle_group, primary_muscles,
                    is_custom, created_by, source)
                   VALUES (%s, %s, %s, %s, %s, TRUE, %s, 'custom')
                   RETURNING *""",
                (
                    payload.name.strip(),
                    payload.body_part,
                    payload.equipment or "",
                    payload.body_part,
                    ",".join(payload.primary_muscles) if payload.primary_muscles else "",
                    user_id,
                )
            )
            row = cur.fetchone()
        result = exercise_urls(dict(row))
        result["is_custom"] = True
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create custom exercise: {str(e)}")


@router.get("/{exercise_id}")
def get_exercise(exercise_id: int, db: psycopg2.extensions.connection = Depends(get_db)):
    """Get a single exercise by ID with full detail."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM exercises WHERE id = %s", (exercise_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    return exercise_urls(dict(row))


@router.get("/{exercise_name}/last-set")
def get_last_set(
    exercise_name: str,
    user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """Get the most recent set for an exercise by current user."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT s.weight_kg, s.reps, s.rpe, s.one_rm_est, w.session_date
               FROM sets s
               JOIN exercises e ON s.exercise_id = e.id
               JOIN workouts w ON s.workout_id = w.id
               WHERE e.name = %s AND w.user_id = %s
               ORDER BY w.session_date DESC, s.id DESC
               LIMIT 1""",
            (exercise_name, user_id)
        )
        row = cur.fetchone()

    if not row:
        return None
    return dict(row)


@router.get("/{exercise_name}/pr")
def get_pr(
    exercise_name: str,
    user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """Get the user's best one_rm_est for an exercise."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT MAX(s.one_rm_est) as pr
               FROM sets s
               JOIN exercises e ON s.exercise_id = e.id
               JOIN workouts w ON s.workout_id = w.id
               WHERE e.name = %s AND w.user_id = %s""",
            (exercise_name, user_id)
        )
        row = cur.fetchone()

    if not row or row.get("pr") is None:
        return {"pr": 0}
    return {"pr": row["pr"]}


@router.get("/history/{exercise_name}")
def get_history(
    exercise_name: str,
    user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """Get all sets from the most recent session for an exercise."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # First find the most recent workout that contains this exercise for the user
        cur.execute(
            """SELECT w.id, w.session_date
               FROM workouts w
               JOIN sets s ON w.id = s.workout_id
               JOIN exercises e ON s.exercise_id = e.id
               WHERE e.name = %s AND w.user_id = %s
               ORDER BY w.session_date DESC
               LIMIT 1""",
            (exercise_name, user_id)
        )
        workout = cur.fetchone()

        if not workout:
            return []

        # Now get all sets from that workout for this exercise, ordered by set_order
        cur.execute(
            """SELECT s.set_order, s.weight_kg, s.reps, s.rpe
               FROM sets s
               JOIN exercises e ON s.exercise_id = e.id
               WHERE s.workout_id = %s AND e.name = %s
               ORDER BY CAST(s.set_order AS INTEGER)""",
            (workout["id"], exercise_name)
        )
        sets = cur.fetchall()

    return [dict(s) for s in sets] if sets else []
