from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import psycopg2.extras

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Injuries"])

class InjuryLogReq(BaseModel):
    body_part: str
    severity: int
    description: Optional[str] = None
    start_date: date

@router.post("")
def log_injury(payload: InjuryLogReq, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Check if there's already an active injury for this body part
        cur.execute("UPDATE injury_logs SET status='healed', end_date=CURRENT_DATE WHERE user_id=%s AND body_part=%s AND status='active'", (user_id, payload.body_part))
        
        cur.execute("""
            INSERT INTO injury_logs (user_id, body_part, severity, description, start_date, status)
            VALUES (%s, %s, %s, %s, %s, 'active')
            RETURNING id, body_part, severity, description, status, start_date, end_date
        """, (user_id, payload.body_part, payload.severity, payload.description, payload.start_date))
        result = cur.fetchone()
    return result

@router.get("")
def get_injuries(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, body_part, severity, description, status, start_date, end_date 
            FROM injury_logs 
            WHERE user_id = %s 
            ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date DESC
        """, (user_id,))
        return cur.fetchall()

@router.patch("/{injury_id}")
def mark_recovered(injury_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            UPDATE injury_logs 
            SET end_date = CURRENT_DATE, status = 'healed'
            WHERE id = %s AND user_id = %s
            RETURNING id, body_part, severity, description, status, start_date, end_date
        """, (injury_id, user_id))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Injury not found")
        return result

@router.delete("/{injury_id}")
def delete_injury(injury_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("DELETE FROM injury_logs WHERE id = %s AND user_id = %s", (injury_id, user_id))
    return {"success": True}
