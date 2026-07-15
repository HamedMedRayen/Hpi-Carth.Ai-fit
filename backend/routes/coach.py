from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import psycopg2.extras

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Coach"])

class InviteReq(BaseModel):
    athlete_identifier: str

class RespondReq(BaseModel):
    relationship_id: int
    action: str  # 'accept' or 'decline'

class CoachNoteReq(BaseModel):
    athlete_id: int
    session_id: int
    note: str

class RemoveRelationshipReq(BaseModel):
    relationship_id: int

class SuggestWorkoutReq(BaseModel):
    program_name: str
    program_note: Optional[str] = None
    workouts: list

@router.post("/invite")
def invite_athlete(payload: InviteReq, coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Verify user is a coach
        cur.execute("SELECT role FROM users WHERE id = %s", (coach_id,))
        coach = cur.fetchone()
        if not coach or coach['role'] != 'coach':
            raise HTTPException(status_code=403, detail="Only coaches can invite athletes")
        
        # Find athlete by email, display name, or account nickname
        cur.execute("""
            SELECT u.id, u.name, u.email 
            FROM users u
            JOIN auth_users a ON u.auth_id = a.id
            WHERE u.email = %s OR u.name = %s OR a.nickname = %s
        """, (payload.athlete_identifier, payload.athlete_identifier, payload.athlete_identifier))
        athlete = cur.fetchone()
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found")
            
        athlete_id = athlete['id']
        
        if coach_id == athlete_id:
            raise HTTPException(status_code=400, detail="Cannot invite yourself")
            
        # Check existing relationship
        cur.execute("""
            SELECT id, status FROM coach_relationships 
            WHERE coach_id = %s AND athlete_id = %s
        """, (coach_id, athlete_id))
        existing = cur.fetchone()
        
        if existing:
            if existing['status'] == 'active':
                raise HTTPException(status_code=400, detail="Athlete is already connected")
            # Re-invite if declined or pending
            cur.execute("""
                UPDATE coach_relationships SET status = 'pending', created_at = NOW()
                WHERE id = %s RETURNING id
            """, (existing['id'],))
        else:
            cur.execute("""
                INSERT INTO coach_relationships (coach_id, athlete_id, status)
                VALUES (%s, %s, 'pending')
                RETURNING id
            """, (coach_id, athlete_id))
        
    return {"success": True, "message": f"Invite sent to {athlete['name']}"}

@router.get("/athletes")
def get_my_athletes(coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT r.id as relationship_id, r.status, u.id as athlete_id, u.name, u.email,
                   u.bodyweight, u.experience, u.goal, u.avatar_url,
                   (SELECT COUNT(*) FROM workouts WHERE user_id = u.id) as total_sessions,
                   (SELECT MAX(session_date) FROM workouts WHERE user_id = u.id) as last_session,
                   (SELECT COALESCE(SUM(s2.volume_load), 0) FROM sets s2 
                    JOIN workouts w2 ON s2.workout_id = w2.id 
                    WHERE w2.user_id = u.id) as total_volume
            FROM coach_relationships r
            JOIN users u ON r.athlete_id = u.id
            WHERE r.coach_id = %s
            ORDER BY r.status ASC, u.name ASC
        """, (coach_id,))
        return cur.fetchall()

@router.get("/athletes/{athlete_id}/stats")
def get_athlete_stats(athlete_id: int, coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Get detailed stats for a specific athlete (coach-only)."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Verify coach-athlete relationship is active
        cur.execute("""
            SELECT id FROM coach_relationships 
            WHERE coach_id = %s AND athlete_id = %s AND status = 'active'
        """, (coach_id, athlete_id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="No active relationship with this athlete")
        
        # Get athlete profile
        cur.execute("SELECT * FROM users WHERE id = %s", (athlete_id,))
        profile = cur.fetchone()
        
        # Get workout summary
        cur.execute("""
            SELECT COUNT(*) as total_sessions,
                   COALESCE(AVG(duration_sec), 0) as avg_duration_sec,
                   MAX(session_date) as last_session
            FROM workouts WHERE user_id = %s
        """, (athlete_id,))
        workout_summary = cur.fetchone()
        
        # Get total volume
        cur.execute("""
            SELECT COALESCE(SUM(s.volume_load), 0) as total_volume,
                   COALESCE(SUM(s.reps), 0) as total_reps,
                   COUNT(DISTINCT s.exercise_id) as exercises_used,
                   COALESCE(MAX(s.one_rm_est), 0) as best_1rm
            FROM sets s
            JOIN workouts w ON s.workout_id = w.id
            WHERE w.user_id = %s
        """, (athlete_id,))
        set_summary = cur.fetchone()
        
        # Get recent workouts (last 10)
        cur.execute("""
            SELECT w.id, w.workout_name, w.session_date, w.duration_sec,
                   COUNT(s.id) as set_count,
                   COALESCE(SUM(s.volume_load), 0) as volume
            FROM workouts w
            LEFT JOIN sets s ON s.workout_id = w.id
            WHERE w.user_id = %s
            GROUP BY w.id, w.workout_name, w.session_date, w.duration_sec
            ORDER BY w.session_date DESC
            LIMIT 10
        """, (athlete_id,))
        recent_workouts = cur.fetchall()
        
        # Get body part distribution
        cur.execute("""
            SELECT e.muscle_group, COUNT(*) as count
            FROM sets s
            JOIN workouts w ON s.workout_id = w.id
            JOIN exercises e ON s.exercise_id = e.id
            WHERE w.user_id = %s
            GROUP BY e.muscle_group
            ORDER BY count DESC
            LIMIT 8
        """, (athlete_id,))
        muscle_distribution = cur.fetchall()
        
        # Get weekly sessions (last 8 weeks)
        cur.execute("""
            SELECT DATE_TRUNC('week', session_date::date) as week,
                   COUNT(*) as sessions
            FROM workouts
            WHERE user_id = %s AND session_date::date >= CURRENT_DATE - INTERVAL '8 weeks'
            GROUP BY week
            ORDER BY week
        """, (athlete_id,))
        weekly_sessions = cur.fetchall()
        
        # Get active injuries
        cur.execute("""
            SELECT body_part, severity, description, start_date
            FROM injury_logs
            WHERE user_id = %s AND status = 'active'
            ORDER BY start_date DESC
        """, (athlete_id,))
        active_injuries = cur.fetchall()
        
        # Get latest fatigue
        cur.execute("""
            SELECT raw_score, borg_score, level, label, logged_at
            FROM fatigue_logs
            WHERE user_id = %s
            ORDER BY logged_at DESC LIMIT 1
        """, (athlete_id,))
        latest_fatigue = cur.fetchone()
        
        return {
            "profile": profile,
            "workout_summary": workout_summary,
            "set_summary": set_summary,
            "recent_workouts": recent_workouts,
            "muscle_distribution": muscle_distribution,
            "weekly_sessions": weekly_sessions,
            "active_injuries": active_injuries,
            "latest_fatigue": latest_fatigue,
        }

@router.get("/my-coach")
def get_my_coach(athlete_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Get pending and active
        cur.execute("""
            SELECT r.id as relationship_id, r.status, u.id as coach_id, u.name as coach_name, 
                   u.email as coach_email, u.avatar_url as coach_avatar
            FROM coach_relationships r
            JOIN users u ON r.coach_id = u.id
            WHERE r.athlete_id = %s AND r.status IN ('pending', 'active')
        """, (athlete_id,))
        return cur.fetchall()

@router.post("/respond")
def respond_invite(payload: RespondReq, athlete_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        status = 'active' if payload.action == 'accept' else 'declined'
        cur.execute("""
            UPDATE coach_relationships 
            SET status = %s 
            WHERE id = %s AND athlete_id = %s
        """, (status, payload.relationship_id, athlete_id))
    return {"success": True, "status": status}

@router.post("/remove")
def remove_relationship(payload: RemoveRelationshipReq, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            DELETE FROM coach_relationships 
            WHERE id = %s AND (coach_id = %s OR athlete_id = %s)
        """, (payload.relationship_id, user_id, user_id))
    return {"success": True}

@router.post("/notes")
def add_coach_note(payload: CoachNoteReq, coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO coach_notes (coach_id, athlete_id, session_id, note)
            VALUES (%s, %s, %s, %s)
            RETURNING id, note, created_at
        """, (coach_id, payload.athlete_id, payload.session_id, payload.note))
        return cur.fetchone()

@router.get("/notes/session/{session_id}")
def get_session_notes(session_id: int, athlete_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT n.id, n.note, n.created_at, u.name as coach_name
            FROM coach_notes n
            JOIN users u ON n.coach_id = u.id
            WHERE n.session_id = %s
        """, (session_id,))
        return cur.fetchall()

@router.get("/role")
def get_user_role(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Get the current user's role."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return {"role": row["role"] if row else "athlete"}

@router.post("/athletes/{athlete_id}/suggest-workout")
def suggest_workout(athlete_id: int, payload: SuggestWorkoutReq, coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    import json
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Verify active relationship
        cur.execute("""
            SELECT id FROM coach_relationships 
            WHERE coach_id = %s AND athlete_id = %s AND status = 'active'
        """, (coach_id, athlete_id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="No active relationship with this athlete")
        
        # Insert notification
        cur.execute("""
            INSERT INTO notifications (user_id, sender_id, type, title, message, data)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            athlete_id, 
            coach_id, 
            'workout_suggestion', 
            f"New Program: {payload.program_name}", 
            f"Your coach has suggested a {len(payload.workouts)}-day training program for you.", 
            json.dumps({"program_name": payload.program_name, "program_note": payload.program_note, "workouts": payload.workouts})
        ))
        
    return {"success": True}
