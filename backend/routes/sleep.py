from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import psycopg2.extras

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Sleep"])

class SleepLogReq(BaseModel):
    date: date
    hours: float
    quality: int
    notes: Optional[str] = None

@router.post("/log")
def log_sleep(payload: SleepLogReq, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO sleep_logs (user_id, date, hours, quality, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id, date) DO UPDATE 
            SET hours = EXCLUDED.hours, 
                quality = EXCLUDED.quality, 
                notes = EXCLUDED.notes
        """, (user_id, payload.date, payload.hours, payload.quality, payload.notes))
    return {"success": True}

@router.get("/history")
def get_sleep_history(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT date, hours, quality, notes 
            FROM sleep_logs 
            WHERE user_id = %s 
            ORDER BY date DESC 
            LIMIT 30
        """, (user_id,))
        return cur.fetchall()

@router.get("/correlation")
def get_sleep_correlation(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT s.date, s.hours as sleep_hours, s.quality, 
                   COALESCE(SUM(m.total_volume), 0) as session_volume
            FROM sleep_logs s
            LEFT JOIN metrics m ON s.user_id = m.user_id AND CAST(m.session_date AS DATE) = s.date
            WHERE s.user_id = %s
            GROUP BY s.date, s.hours, s.quality
            ORDER BY s.date DESC
            LIMIT 14
        """, (user_id,))
        return cur.fetchall()
