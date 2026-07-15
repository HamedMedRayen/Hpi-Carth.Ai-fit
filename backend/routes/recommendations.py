"""
HPI — /api/recommendations routes
Get intelligent workout plan recommendations based on user profile and constraints.
"""
import psycopg2
import psycopg2.extras
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id
from services.recommendation_engine import get_recommendation

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# Load workout plans
PLANS_PATH = Path(__file__).parent.parent / "data" / "workout_plans.json"
PLANS = json.loads(PLANS_PATH.read_text())


class RecommendPayload(BaseModel):
    user_id: int = Field(..., description="User ID")
    experience: str = Field(default="beginner", description="beginner / intermediate / advanced")
    goal: str = Field(default="muscle_gain", description="muscle_gain / strength / general_fitness / fat_loss")
    days_available: Optional[int] = Field(default=3, ge=2, le=6, description="Days per week available (2-6)")
    hypertension: str = Field(default="No", description="Yes or No")
    diabetes: str = Field(default="No", description="Yes or No")
    last_plan_id: Optional[str] = Field(default=None, description="Current plan ID to exclude")


@router.post("/")
def get_recommendation_endpoint(
    payload: RecommendPayload,
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """
    Get a personalized workout plan recommendation.
    
    POST body:
        - user_id: int
        - experience: "beginner" | "intermediate" | "advanced"
        - goal: "muscle_gain" | "strength" | "general_fitness" | "fat_loss"
        - days_available: int (default 3, range 2-6)
        - hypertension: "Yes" | "No"
        - diabetes: "Yes" | "No"
    
    Returns: Selected workout plan with sessions and exercises
    """
    try:
        # Fetch last plan ID — prefer client-sent value, fallback to DB
        last_plan_id = payload.last_plan_id
        if not last_plan_id:
            cursor = db.cursor()
            cursor.execute(
                "SELECT plan_id FROM recommendation_history WHERE user_id = %s",
                (payload.user_id,),
            )
            result = cursor.fetchone()
            last_plan_id = result["plan_id"] if result else None
            cursor.close()
        
        # Get recommendation using the recommendation engine
        plan = get_recommendation(
            user_id=payload.user_id,
            level=payload.experience,
            goal=payload.goal,
            days_available=payload.days_available,
            hypertension=payload.hypertension,
            diabetes=payload.diabetes,
            last_plan_id=last_plan_id,
            db=db,
        )
        
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plans")
def get_all_plans(user_id: Optional[int] = Depends(get_current_user_id), db=Depends(get_db)):
    """
    Get all available workout plans from the catalog + user's saved plans.
    """
    all_plans = list(PLANS)
    
    if user_id:
        cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT id, name, description, split_type, level, goal, 
                   days_per_week, duration_weeks, weekly_schedule, sessions, equipment, created_at
            FROM user_plans WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        user_plans = cur.fetchall()
        for p in user_plans:
            p["is_custom"] = True
        all_plans.extend(user_plans)
        
    return all_plans


@router.post("/save")
def save_user_plan(payload: dict, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Save a recommended plan to user_plans"""
    if not payload.get("name") and not payload.get("plan_name"):
        raise HTTPException(status_code=400, detail="Plan name required")
    
    name = payload.get("plan_name") or payload.get("name")
    
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO user_plans (
            user_id, name, description, split_type, level, goal, 
            days_per_week, duration_weeks, weekly_schedule, sessions, equipment
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, created_at
    """, (
        user_id,
        name,
        payload.get("summary") or payload.get("description", ""),
        payload.get("split_type", "Custom"),
        payload.get("level", "intermediate"),
        payload.get("goal", "general"),
        payload.get("days_available") or payload.get("days_per_week", 3),
        payload.get("duration_weeks", 4),
        json.dumps(payload.get("weekly_schedule", {})),
        json.dumps(payload.get("sessions", [])),
        payload.get("equipment", [])
    ))
    db.commit()
    return cur.fetchone()


@router.get("/history/{user_id}")
def get_user_plan_history(
    user_id: int,
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """
    Get the user's last recommended plan from recommendation_history.
    
    Returns: Full plan object if history exists, null otherwise
    """
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT plan_id FROM recommendation_history WHERE user_id = %s",
            (user_id,),
        )
        result = cursor.fetchone()
        cursor.close()
        
        if not result:
            return None
        
        plan_id = result["plan_id"]
        
        # Find plan in catalog by ID
        for plan in PLANS:
            if plan["id"] == plan_id:
                return plan
        
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
