from fastapi import APIRouter, HTTPException, Depends
from routes.auth import get_current_user_id
from services.challenge_service import challenge_service
from typing import List, Dict, Any
from database import get_db
import psycopg2.extras
import json
from datetime import datetime

router = APIRouter(prefix="/challenges", tags=["Challenges"])

@router.get("")
async def list_challenges():
    """List all available fitness challenges."""
    return challenge_service.get_all_challenges()

@router.get("/{challenge_id}")
async def get_challenge(challenge_id: str):
    """Get details for a specific challenge."""
    challenge = challenge_service.get_challenge_by_id(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge

@router.get("/active/{user_id}")
async def get_active_challenge(user_id: int, current_user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Get the active challenge for a user."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM user_challenges WHERE user_id = %s AND status = 'active' LIMIT 1", (user_id,))
        active = cur.fetchone()
        
    if not active:
        return {"active": False}
    
    # Get full challenge details
    details = challenge_service.get_challenge_by_id(active["challenge_id"])
    return {"active": True, "user_challenge": active, "challenge_details": details}

@router.post("/join")
async def join_challenge(payload: Dict[str, Any], user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Join a new challenge."""
    challenge_id = payload.get("challenge_id")
    
    if not challenge_id:
        raise HTTPException(status_code=400, detail="Missing challenge_id")
    
    # Check if user already has an active challenge
    with db.cursor() as cur:
        cur.execute("SELECT id FROM user_challenges WHERE user_id = %s AND status = 'active'", (user_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="You already have an active challenge. Cancel or finish it first.")
        
        # Join new challenge
        cur.execute(
            "INSERT INTO user_challenges (user_id, challenge_id, status) VALUES (%s, %s, 'active') RETURNING id",
            (user_id, challenge_id)
        )
        new_id = cur.fetchone()["id"]
        
    return {"status": "success", "id": new_id}

@router.post("/cancel")
async def cancel_challenge(payload: Dict[str, Any], user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Cancel the active challenge."""
    
    with db.cursor() as cur:
        cur.execute(
            "UPDATE user_challenges SET status = 'cancelled' WHERE user_id = %s AND status = 'active'",
            (user_id,)
        )
        
    return {"status": "success"}

@router.post("/checkin")
async def checkin_challenge(payload: Dict[str, Any], user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Check-in for a challenge day."""
    day = payload.get("day")
    
    if day is None:
        raise HTTPException(status_code=400, detail="Missing day")
    
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM user_challenges WHERE user_id = %s AND status = 'active' LIMIT 1", (user_id,))
        active = cur.fetchone()
        if not active:
            raise HTTPException(status_code=404, detail="No active challenge found")
        
        progress = active["progress_days"] if active["progress_days"] else []
        # Check if already checked in for this day
        if any(p["day"] == day for p in progress):
            return {"status": "already_checked_in"}
            
        progress.append({
            "day": day,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "done"
        })
        
        cur.execute(
            "UPDATE user_challenges SET progress_days = %s WHERE id = %s",
            (json.dumps(progress), active["id"])
        )
        
        # Check if challenge is finished (based on duration from service)
        challenge_details = challenge_service.get_challenge_by_id(active["challenge_id"])
        if len(progress) >= challenge_details["duration_days"]:
            cur.execute(
                "UPDATE user_challenges SET status = 'completed', completed_at = NOW() WHERE id = %s",
                (active["id"],)
            )
            return {"status": "challenge_completed"}
            
    return {"status": "success", "progress": progress}
