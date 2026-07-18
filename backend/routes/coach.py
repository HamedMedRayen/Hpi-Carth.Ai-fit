from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import List, Optional
from pydantic import BaseModel
import psycopg2.extras
import os
import uuid
import shutil
import json

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

class HireReq(BaseModel):
    coach_id: int

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
                UPDATE coach_relationships SET status = 'pending', initiated_by = 'coach', created_at = NOW()
                WHERE id = %s RETURNING id
            """, (existing['id'],))
        else:
            cur.execute("""
                INSERT INTO coach_relationships (coach_id, athlete_id, status, initiated_by)
                VALUES (%s, %s, 'pending', 'coach')
                RETURNING id
            """, (coach_id, athlete_id))
        
    db.commit()
    return {"success": True, "message": f"Invite sent to {athlete['name']}"}

@router.get("/coaches")
def get_all_coaches(current_user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """List all coaches and the current user's relationship status with them."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT u.id as coach_id, u.name as coach_name, u.email as coach_email, 
                   u.avatar_url as coach_avatar, u.experience, u.goal, u.age, u.sex,
                   r.id as relationship_id, r.status, r.initiated_by
            FROM users u
            LEFT JOIN coach_relationships r 
              ON r.coach_id = u.id AND r.athlete_id = %s
            WHERE u.role = 'coach' AND u.approved = TRUE
            ORDER BY u.name ASC
        """, (current_user_id,))
        return cur.fetchall()

@router.post("/hire")
def hire_coach(payload: HireReq, athlete_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    """Send a hire request from an athlete to a coach."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Verify target is a coach
        cur.execute("SELECT role, name FROM users WHERE id = %s", (payload.coach_id,))
        coach = cur.fetchone()
        if not coach or coach['role'] != 'coach':
            raise HTTPException(status_code=400, detail="User is not a coach")
            
        if payload.coach_id == athlete_id:
            raise HTTPException(status_code=400, detail="Cannot hire yourself")
            
        # Check existing relationship
        cur.execute("""
            SELECT id, status FROM coach_relationships 
            WHERE coach_id = %s AND athlete_id = %s
        """, (payload.coach_id, athlete_id))
        existing = cur.fetchone()
        
        if existing:
            if existing['status'] == 'active':
                raise HTTPException(status_code=400, detail="You are already connected to this coach")
            # Re-invite/hire
            cur.execute("""
                UPDATE coach_relationships 
                SET status = 'pending', initiated_by = 'athlete', created_at = NOW()
                WHERE id = %s RETURNING id
            """, (existing['id'],))
        else:
            cur.execute("""
                INSERT INTO coach_relationships (coach_id, athlete_id, status, initiated_by)
                VALUES (%s, %s, 'pending', 'athlete')
                RETURNING id
            """, (payload.coach_id, athlete_id))
            
    db.commit()
    return {"success": True, "message": f"Hire request sent to {coach['name']}"}

@router.get("/athletes")
def get_my_athletes(coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT r.id as relationship_id, r.status, r.initiated_by, u.id as athlete_id, u.name, u.email,
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

        # Get sleep logs (last 7 logs)
        cur.execute("""
            SELECT date::text as date, hours, quality, notes
            FROM sleep_logs
            WHERE user_id = %s
            ORDER BY date DESC
            LIMIT 7
        """, (athlete_id,))
        recent_sleep = cur.fetchall()

        # Get weight logs (last 10 logs)
        cur.execute("""
            SELECT weight_kg, logged_at::text as logged_at
            FROM bodyweight_logs
            WHERE user_id = %s
            ORDER BY logged_at DESC
            LIMIT 10
        """, (athlete_id,))
        recent_weights = cur.fetchall()

        # Get nutrition logs (last 7 entries)
        cur.execute("""
            SELECT date::text as date, 
                   COALESCE(SUM(calories), 0) as calories,
                   COALESCE(SUM(protein_g), 0) as protein,
                   COALESCE(SUM(carbs_g), 0) as carbs,
                   COALESCE(SUM(fat_g), 0) as fat
            FROM nutrition_logs
            WHERE user_id = %s AND date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY date
            ORDER BY date DESC
        """, (athlete_id,))
        recent_nutrition = cur.fetchall()

        # Get target nutrition
        cur.execute("""
            SELECT final_calories, final_protein, final_carbs, final_fat, goal, pace, diet_style
            FROM nutrition_targets
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (athlete_id,))
        nutrition_target = cur.fetchone()

        # Get personal records
        cur.execute("""
            SELECT pr.weight_kg, pr.reps, pr.one_rm_est, pr.achieved_date::text as achieved_date, e.name as exercise_name
            FROM personal_records pr
            JOIN exercises e ON pr.exercise_id = e.id
            WHERE pr.user_id = %s
            ORDER BY pr.one_rm_est DESC
        """, (athlete_id,))
        personal_records = cur.fetchall()
        
        return {
            "profile": profile,
            "workout_summary": workout_summary,
            "set_summary": set_summary,
            "recent_workouts": recent_workouts,
            "muscle_distribution": muscle_distribution,
            "weekly_sessions": weekly_sessions,
            "active_injuries": active_injuries,
            "latest_fatigue": latest_fatigue,
            "recent_sleep": recent_sleep,
            "recent_weights": recent_weights,
            "recent_nutrition": recent_nutrition,
            "nutrition_target": nutrition_target,
            "personal_records": personal_records,
        }

@router.get("/my-coach")
def get_my_coach(athlete_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Get pending and active
        cur.execute("""
            SELECT r.id as relationship_id, r.status, r.initiated_by, u.id as coach_id, u.name as coach_name, 
                   u.email as coach_email, u.avatar_url as coach_avatar
            FROM coach_relationships r
            JOIN users u ON r.coach_id = u.id
            WHERE r.athlete_id = %s AND r.status IN ('pending', 'active')
        """, (athlete_id,))
        return cur.fetchall()

@router.post("/respond")
def respond_invite(payload: RespondReq, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        status = 'active' if payload.action == 'accept' else 'declined'
        cur.execute("""
            UPDATE coach_relationships 
            SET status = %s 
            WHERE id = %s AND (athlete_id = %s OR coach_id = %s)
        """, (status, payload.relationship_id, user_id, user_id))
    db.commit()
    return {"success": True, "status": status}

@router.post("/remove")
def remove_relationship(payload: RemoveRelationshipReq, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            DELETE FROM coach_relationships 
            WHERE id = %s AND (coach_id = %s OR athlete_id = %s)
        """, (payload.relationship_id, user_id, user_id))
    db.commit()
    return {"success": True}

@router.post("/notes")
def add_coach_note(payload: CoachNoteReq, coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO coach_notes (coach_id, athlete_id, session_id, note)
            VALUES (%s, %s, %s, %s)
            RETURNING id, note, created_at
        """, (coach_id, payload.athlete_id, payload.session_id, payload.note))
        row = cur.fetchone()
    db.commit()
    return row

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
        
    db.commit()
    return {"success": True}


# ── Gyms & Coach Locations Endpoints ─────────────────────────────────

class GymCoachRead(BaseModel):
    coach_id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    experience: Optional[str] = None
    goal: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None

class GymRead(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    coaches: List[GymCoachRead] = []

class SelectGymsReq(BaseModel):
    gym_ids: List[int]

@router.get("/gyms", response_model=List[GymRead])
def get_gyms(db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Fetch all gyms
        cur.execute("SELECT id, name, address, latitude, longitude FROM gyms ORDER BY name ASC")
        gyms = cur.fetchall()
        
        # For each gym, get associated coaches
        for gym in gyms:
            cur.execute("""
                SELECT u.id as coach_id, u.name, u.email, u.avatar_url, u.experience, u.goal, u.age, u.sex
                FROM coach_gyms cg
                JOIN users u ON cg.coach_id = u.id
                WHERE cg.gym_id = %s AND u.approved = TRUE
            """, (gym["id"],))
            gym["coaches"] = cur.fetchall()
        return gyms

@router.post("/gyms/select")
def select_gyms(payload: SelectGymsReq, coach_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        # Delete old relations
        cur.execute("DELETE FROM coach_gyms WHERE coach_id = %s", (coach_id,))
        # Insert new relations
        for gym_id in payload.gym_ids:
            cur.execute("INSERT INTO coach_gyms (coach_id, gym_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (coach_id, gym_id))
    db.commit()
    return {"success": True}


@router.post("/onboarding")
async def coach_onboarding(
    specialty: str = Form(...),
    experience: str = Form(...),
    age: int = Form(...),
    sex: str = Form(...),
    bio: str = Form(None),
    cv_file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Submit CV and profile info for coach onboarding. Status set to approved = FALSE."""
    # 1. Validate file extension/type (accept PDF, DOCX, Images)
    ext = os.path.splitext(cv_file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(status_code=400, detail="CV must be a PDF, Word Document, or Image")

    # 2. Ensure uploads directory exists
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # 3. Create unique filename
    filename = f"cv_{current_user_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(uploads_dir, filename)

    # 4. Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(cv_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save CV file: {str(e)}")

    # 5. Get base URL and form url path
    from database import BASE_URL
    cv_url = f"{BASE_URL}/api/uploads/{filename}"

    # 6. Update database fields
    with db.cursor() as cur:
        # Check if user is a coach
        cur.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
        usr = cur.fetchone()
        if not usr or usr[0] != 'coach':
            raise HTTPException(status_code=400, detail="Only users with the 'coach' role can submit onboarding.")

        cur.execute("""
            UPDATE users 
            SET goal = %s, experience = %s, age = %s, sex = %s, bio = %s, cv_url = %s, approved = FALSE, updated_at = NOW()
            WHERE id = %s
        """, (specialty, experience, age, sex, bio, cv_url, current_user_id))
    
    db.commit()
    return {"success": True, "message": "Onboarding submitted successfully. An administrator will review your application."}

