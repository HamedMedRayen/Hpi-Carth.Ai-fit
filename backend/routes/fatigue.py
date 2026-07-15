import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Fatigue"])

class FatigueLogCreate(BaseModel):
    raw_score: float
    borg_score: float
    level: int
    label: str
    answers: Dict[str, int]

class FatigueLogResponse(BaseModel):
    id: int
    logged_at: datetime

class FatigueHistoryRecord(BaseModel):
    id: int
    borg_score: float
    level: int
    label: str
    logged_at: datetime

@router.post("/log", response_model=FatigueLogResponse)
def log_fatigue(payload: FatigueLogCreate, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    import json
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO fatigue_logs (user_id, raw_score, borg_score, level, label, answers)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, logged_at
        """, (
            user_id,
            payload.raw_score,
            payload.borg_score,
            payload.level,
            payload.label,
            json.dumps(payload.answers)
        ))
        result = cur.fetchone()
    db.commit()
    return result

@router.get("/history", response_model=List[FatigueHistoryRecord])
def get_fatigue_history(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, borg_score, level, label, logged_at
            FROM fatigue_logs
            WHERE user_id = %s
            ORDER BY logged_at DESC
            LIMIT 20
        """, (user_id,))
        results = cur.fetchall()
    return results or []
