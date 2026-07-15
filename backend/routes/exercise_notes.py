"""HPI — /api/exercise-notes routes (sticky notes per exercise)"""
import logging
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id

log = logging.getLogger("hpi")
router = APIRouter(tags=["ExerciseNotes"])


class NotePayload(BaseModel):
    note: str


@router.get("/{exercise_id}")
def get_note(
    exercise_id: int,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Return the sticky note for an exercise, or null if none exists."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, note, updated_at FROM exercise_notes WHERE user_id = %s AND exercise_id = %s",
            (user_id, exercise_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


@router.post("/{exercise_id}")
def upsert_note(
    exercise_id: int,
    payload: NotePayload,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Create or update the sticky note for an exercise (upsert)."""
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO exercise_notes (user_id, exercise_id, note)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, exercise_id)
                DO UPDATE SET note = EXCLUDED.note, updated_at = now()
                RETURNING id
                """,
                (user_id, exercise_id, payload.note.strip()),
            )
            row = cur.fetchone()
        db.commit()
        return {"success": True, "id": row["id"] if row else None}
    except Exception as e:
        db.rollback()
        log.error("ExerciseNote upsert error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{exercise_id}")
def delete_note(
    exercise_id: int,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Delete the sticky note for an exercise."""
    try:
        with db.cursor() as cur:
            cur.execute(
                "DELETE FROM exercise_notes WHERE user_id = %s AND exercise_id = %s",
                (user_id, exercise_id),
            )
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        log.error("ExerciseNote delete error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
