"""HPI — /api/bodyweight routes (body weight logging)"""
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime, timedelta, date

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="/bodyweight", tags=["BodyWeight"])


class BodyWeightLogCreate(BaseModel):
    weight_kg: float


class BodyWeightLogRead(BaseModel):
    id: int
    user_id: int
    weight_kg: float
    logged_at: Optional[date] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


@router.post("", response_model=BodyWeightLogRead, status_code=201)
def log_body_weight(payload: BodyWeightLogCreate, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Log body weight for today (upsert by day) and update user bodyweight profile"""
    today_date = datetime.now().date()
    
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Upsert: if already logged today, update; otherwise insert
        cur.execute("""
            INSERT INTO bodyweight_logs (user_id, logged_at, weight_kg)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, logged_at) DO UPDATE 
            SET weight_kg = EXCLUDED.weight_kg
            RETURNING id, user_id, weight_kg, logged_at, created_at
        """, (user_id, today_date, payload.weight_kg))
        result = cur.fetchone()

        # Keep users.bodyweight in sync
        cur.execute("UPDATE users SET bodyweight = %s, updated_at = NOW() WHERE id = %s", (payload.weight_kg, user_id))
    
    db.commit()
    return result


@router.get("", response_model=List[BodyWeightLogRead])
def get_body_weight_log(days: int = Query(30, ge=1, le=365), user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Get body weight log for the last N days, sorted by date"""
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, user_id, weight_kg, logged_at, created_at
            FROM bodyweight_logs
            WHERE user_id = %s AND logged_at >= %s
            ORDER BY logged_at ASC
        """, (user_id, start_date))
        results = cur.fetchall()
    
    return results or []
