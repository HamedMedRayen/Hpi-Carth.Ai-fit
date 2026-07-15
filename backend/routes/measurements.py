"""HPI — /api/measurements routes (body measurements tracker)"""
import logging
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Any, Dict

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id
from models.measurements import MeasurementEntry

log = logging.getLogger("hpi")
router = APIRouter(tags=["Measurements"])

FIELDS = [
    "neck", "shoulders", "chest", "waist", "hips",
    "left_arm", "right_arm", "left_thigh", "right_thigh",
    "left_calf", "right_calf",
]


@router.post("/log")
def log_measurement(
    payload: MeasurementEntry,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Insert a body measurement entry for the authenticated user."""
    cols = ["user_id", "date"] + FIELDS
    values = [user_id, str(payload.date)] + [getattr(payload, f) for f in FIELDS]
    placeholders = ", ".join(["%s"] * len(cols))
    col_names = ", ".join(cols)

    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"INSERT INTO measurements ({col_names}) VALUES ({placeholders}) RETURNING id",
                values,
            )
            row = cur.fetchone()
        db.commit()
        return {"success": True, "id": row["id"] if row else None}
    except Exception as e:
        db.rollback()
        log.error("Measurements save error user_id=%s: %s", user_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_history(
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
) -> List[Dict[str, Any]]:
    """Fetch the last 50 measurement entries for the authenticated user."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, user_id, date, neck, shoulders, chest, waist, hips,
                   left_arm, right_arm, left_thigh, right_thigh,
                   left_calf, right_calf, created_at
            FROM measurements
            WHERE user_id = %s
            ORDER BY date DESC
            LIMIT 50
            """,
            (user_id,),
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows] if rows else []


@router.get("/latest")
def get_latest(
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
) -> Optional[Dict[str, Any]]:
    """Fetch the most recent measurement entry for the authenticated user."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, user_id, date, neck, shoulders, chest, waist, hips,
                   left_arm, right_arm, left_thigh, right_thigh,
                   left_calf, right_calf, created_at
            FROM measurements
            WHERE user_id = %s
            ORDER BY date DESC
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


@router.delete("/{entry_id}")
def delete_measurement(
    entry_id: int,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Delete a measurement entry — verifies ownership first."""
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id FROM measurements WHERE id = %s AND user_id = %s",
                (entry_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Entry not found or not yours.")
            cur.execute("DELETE FROM measurements WHERE id = %s", (entry_id,))
        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log.error("Measurements delete error user_id=%s entry_id=%s: %s", user_id, entry_id, e)
        raise HTTPException(status_code=500, detail=str(e))
