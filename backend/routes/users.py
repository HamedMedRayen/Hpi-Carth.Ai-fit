"""HPI — /api/users routes (v2)"""
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query
import os
import shutil
import uuid
from typing import List
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models.user import UserCreate, UserRead, UserUpdate, UserStats
from repositories.user_repo import UserRepository
from routes.auth import get_current_user_id

router = APIRouter(prefix="/users", tags=["Users"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bodyweight: Optional[float] = None
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    experience: Optional[str] = None
    goal: Optional[str] = None
    hypertension: Optional[str] = None
    diabetes: Optional[str] = None
    role: Optional[str] = None


def _repo(db=Depends(get_db)):
    return UserRepository(db)


@router.get("/",        response_model=List[UserRead])
def list_users(
    limit: int = Query(50, le=100),
    offset: int = 0,
    current_user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
    repo=Depends(_repo)
):
    user = repo.get_by_id(current_user_id)
    if user and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return repo.get_all(limit=limit, offset=offset)


@router.patch("/me", response_model=UserRead)
def update_current_user(payload: ProfileUpdate, user_id: int = Depends(get_current_user_id), db: psycopg2.extensions.connection = Depends(get_db)):
    """Update current user profile (uses JWT token)"""
    repo = UserRepository(db)
    if not repo.get_by_id(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")
    
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return repo.get_by_id(user_id)
    
    # Build dynamic UPDATE
    fields = ", ".join(f"{k} = %s" for k in data)
    values = list(data.values()) + [user_id]
    with db.cursor() as cur:
        cur.execute(f"UPDATE users SET {fields}, updated_at=NOW() WHERE id=%s", values)
    
    # If weight is being updated, log it to bodyweight_logs
    if "bodyweight" in data and data["bodyweight"]:
        from datetime import datetime
        today_date = datetime.now().date()
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO bodyweight_logs (user_id, logged_at, weight_kg)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, logged_at) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
            """, (user_id, today_date, data["bodyweight"]))
    
    db.commit()
    return repo.get_by_id(user_id)


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db)
):
    """Upload and set user avatar"""
    # 1. Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 2. Ensure uploads directory exists
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # 3. Create unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"avatar_{user_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(uploads_dir, filename)

    # 4. Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # 5. Update database
    from database import BASE_URL
    avatar_url = f"{BASE_URL}/api/uploads/{filename}"
    
    with db.cursor() as cur:
        cur.execute("UPDATE users SET avatar_url = %s, updated_at = NOW() WHERE id = %s", (avatar_url, user_id))
    
    db.commit()
    
    repo = UserRepository(db)
    return repo.get_by_id(user_id)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, current_user_id: int = Depends(get_current_user_id), repo=Depends(_repo)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: ProfileUpdate, current_user_id: int = Depends(get_current_user_id), db: psycopg2.extensions.connection = Depends(get_db)):
    """Update user profile by ID and log weight to bodyweight_logs if provided"""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    repo = UserRepository(db)
    if not repo.get_by_id(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")
    
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return repo.get_by_id(user_id)
    
    # Build dynamic UPDATE
    fields = ", ".join(f"{k} = %s" for k in data)
    values = list(data.values()) + [user_id]
    with db.cursor() as cur:
        cur.execute(f"UPDATE users SET {fields}, updated_at=NOW() WHERE id=%s", values)
    
    # If weight is being updated, log it to bodyweight_logs
    if "bodyweight" in data and data["bodyweight"]:
        from datetime import datetime
        today_date = datetime.now().date()
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO bodyweight_logs (user_id, logged_at, weight_kg)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, logged_at) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
            """, (user_id, today_date, data["bodyweight"]))
    
    db.commit()
    return repo.get_by_id(user_id)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, current_user_id: int = Depends(get_current_user_id), repo=Depends(_repo)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not repo.delete(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")


@router.get("/{user_id}/stats", response_model=UserStats)
def get_user_stats(user_id: int, current_user_id: int = Depends(get_current_user_id), repo=Depends(_repo)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not repo.get_by_id(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")
    return repo.get_stats(user_id)


@router.get("/{user_id}/streak")
def get_streak(
    user_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db),
):
    """Get workout streak info for a user."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Get last workout date
        cur.execute(
            "SELECT session_date FROM workouts WHERE user_id = %s ORDER BY session_date DESC LIMIT 1",
            (user_id,)
        )
        last_workout = cur.fetchone()
    
    if not last_workout:
        return {
            "last_workout_date": None,
            "days_since_last": None,
            "current_streak": 0,
            "longest_streak": 0
        }
    
    last_date = datetime.strptime(last_workout["session_date"], "%Y-%m-%d").date()
    today = datetime.now().date()
    days_since_last = (today - last_date).days
    
    # Calculate streaks (simplified: consecutive workout days)
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT DISTINCT DATE(session_date) as workout_date 
               FROM workouts WHERE user_id = %s 
               ORDER BY workout_date DESC LIMIT 100""",
            (user_id,)
        )
        dates = [row["workout_date"] for row in cur.fetchall()]
    
    # Calculate current streak
    current_streak = 0
    check_date = today
    if dates and dates[0] >= today:
        check_date = dates[0]
    elif dates and (today - dates[0]).days <= 1:
        current_streak = 1
        check_date = dates[0] - timedelta(days=1)
    
    for date in dates[1:] if current_streak > 0 else dates:
        if (check_date - date).days == 1:
            current_streak += 1
            check_date = date
        else:
            break
    
    return {
        "last_workout_date": str(last_date),
        "days_since_last": days_since_last,
        "current_streak": current_streak,
        "longest_streak": current_streak  # Simplified
    }
