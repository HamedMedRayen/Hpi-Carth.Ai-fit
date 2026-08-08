from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
import psycopg2.extras
import os
import uuid
import shutil
from datetime import datetime

from database import get_db
from routes.auth import get_current_user_id, get_optional_user_id

router = APIRouter(prefix="", tags=["Events"])

UPLOADS_EVENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "events")
os.makedirs(UPLOADS_EVENTS_DIR, exist_ok=True)

class EventCreateReq(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "workshop"  # 'bootcamp', 'webinar', 'group_workout', 'qa_session', 'workshop'
    event_date: str  # ISO string or datetime format
    duration_minutes: int = 60
    location_type: str = "in_person"  # 'online', 'in_person'
    location_detail: Optional[str] = "Tunis, Tunisia"
    max_participants: int = 20
    cost_tnd: float = 0.0
    target_audience: str = "public"  # 'public', 'adherents_only'
    cover_image_url: Optional[str] = None

@router.get("")
def get_all_events(
    event_type: Optional[str] = None,
    current_user_id: Optional[int] = Depends(get_optional_user_id),
    db=Depends(get_db)
):
    """Retrieve all upcoming community events visible to the current user (public or private to host's active adherents)."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """
            SELECT 
                e.id, e.title, e.description, e.event_type, e.event_date,
                e.duration_minutes, e.location_type, e.location_detail,
                e.max_participants, e.cost_tnd, e.target_audience, e.cover_image_url, e.created_at,
                u.id as coach_id, u.name as coach_name, u.avatar_url as coach_avatar,
                u.experience as coach_experience, u.goal as coach_goal,
                COALESCE(reg_stats.reg_count, 0) as registered_count,
                CASE WHEN my_reg.id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered
            FROM events e
            JOIN users u ON e.coach_id = u.id
            LEFT JOIN (
                SELECT event_id, COUNT(*) as reg_count 
                FROM event_registrations 
                WHERE status = 'registered'
                GROUP BY event_id
            ) reg_stats ON reg_stats.event_id = e.id
            LEFT JOIN event_registrations my_reg 
                ON my_reg.event_id = e.id AND my_reg.user_id = %s AND my_reg.status = 'registered'
            WHERE (
                e.target_audience = 'public' 
                OR e.target_audience IS NULL
                OR e.coach_id = %s
                OR EXISTS (
                    SELECT 1 FROM coach_relationships cr 
                    WHERE cr.coach_id = e.coach_id 
                      AND cr.athlete_id = %s 
                      AND cr.status = 'active'
                )
            )
        """
        params = [current_user_id, current_user_id, current_user_id]

        if event_type and event_type != "all":
            query += " AND e.event_type = %s"
            params.append(event_type)

        query += " ORDER BY e.event_date ASC"

        cur.execute(query, tuple(params))
        events = cur.fetchall()

        # Fetch recent attendees for each event to show avatar stacks
        for ev in events:
            ev["registered_count"] = int(ev["registered_count"])
            cur.execute("""
                SELECT u.id as user_id, u.name, u.avatar_url
                FROM event_registrations er
                JOIN users u ON er.user_id = u.id
                WHERE er.event_id = %s AND er.status = 'registered'
                ORDER BY er.registered_at DESC
                LIMIT 5
            """, (ev["id"],))
            ev["attendees"] = cur.fetchall()

        return events

@router.get("/my-registrations")
def get_my_registered_events(
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Retrieve all upcoming events the logged in user is registered for."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                e.id, e.title, e.description, e.event_type, e.event_date,
                e.duration_minutes, e.location_type, e.location_detail,
                e.max_participants, e.cost_tnd, e.target_audience, e.cover_image_url,
                u.id as coach_id, u.name as coach_name, u.avatar_url as coach_avatar,
                er.registered_at
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            JOIN users u ON e.coach_id = u.id
            WHERE er.user_id = %s AND er.status = 'registered'
            ORDER BY e.event_date ASC
        """, (current_user_id,))
        return cur.fetchall()

@router.get("/{event_id}")
def get_event_details(
    event_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Get single event details with full attendee list."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                e.id, e.title, e.description, e.event_type, e.event_date,
                e.duration_minutes, e.location_type, e.location_detail,
                e.max_participants, e.cost_tnd, e.target_audience, e.cover_image_url, e.created_at,
                u.id as coach_id, u.name as coach_name, u.avatar_url as coach_avatar,
                u.experience as coach_experience, u.bio as coach_bio,
                COALESCE(reg_stats.reg_count, 0) as registered_count,
                CASE WHEN my_reg.id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered
            FROM events e
            JOIN users u ON e.coach_id = u.id
            LEFT JOIN (
                SELECT event_id, COUNT(*) as reg_count 
                FROM event_registrations 
                WHERE status = 'registered'
                GROUP BY event_id
            ) reg_stats ON reg_stats.event_id = e.id
            LEFT JOIN event_registrations my_reg 
                ON my_reg.event_id = e.id AND my_reg.user_id = %s AND my_reg.status = 'registered'
            WHERE e.id = %s
        """, (current_user_id, event_id))
        ev = cur.fetchone()
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")

        ev["registered_count"] = int(ev["registered_count"])

        # All attendees
        cur.execute("""
            SELECT u.id as user_id, u.name, u.avatar_url, er.registered_at
            FROM event_registrations er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = %s AND er.status = 'registered'
            ORDER BY er.registered_at DESC
        """, (event_id,))
        ev["attendees"] = cur.fetchall()

        return ev

@router.post("")
def create_event(
    payload: EventCreateReq,
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Create a new community event (Coach role). Automatically logs to schedule and notifies adherents via notifications + chat."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Check user is coach
        cur.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
        usr = cur.fetchone()
        if not usr or usr["role"] != "coach":
            raise HTTPException(status_code=403, detail="Only registered coaches can host community events")

        cur.execute("""
            INSERT INTO events (
                coach_id, title, description, event_type, event_date,
                duration_minutes, location_type, location_detail,
                max_participants, cost_tnd, target_audience, cover_image_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            current_user_id, payload.title, payload.description, payload.event_type,
            payload.event_date, payload.duration_minutes, payload.location_type,
            payload.location_detail, payload.max_participants, payload.cost_tnd,
            payload.target_audience, payload.cover_image_url
        ))
        event_id = cur.fetchone()["id"]

        # Coach automatically registered as host attendee
        cur.execute("""
            INSERT INTO event_registrations (event_id, user_id, status)
            VALUES (%s, %s, 'registered')
            ON CONFLICT DO NOTHING
        """, (event_id, current_user_id))

        # 1. Auto-log event into coach's schedule
        try:
            from datetime import datetime, timedelta
            dt_str = payload.event_date.replace("Z", "+00:00")
            start_dt = datetime.fromisoformat(dt_str)
            end_dt = start_dt + timedelta(minutes=payload.duration_minutes)
            cur.execute("""
                INSERT INTO coach_schedule_items (
                    coach_id, athlete_id, title, item_type, start_time, end_time, location, status
                ) VALUES (%s, NULL, %s, 'event', %s, %s, %s, 'scheduled')
            """, (
                current_user_id,
                f"Community Event: {payload.title}",
                start_dt,
                end_dt,
                payload.location_detail or "Tunis, Tunisia"
            ))
        except Exception as schedule_err:
            print(f"[Events] Auto-log schedule warning: {schedule_err}", flush=True)

        # 2. Get coach details and active adherents
        cur.execute("SELECT name FROM users WHERE id = %s", (current_user_id,))
        coach_row = cur.fetchone()
        coach_name = coach_row["name"] if coach_row else "Your Coach"

        cur.execute("""
            SELECT athlete_id FROM coach_relationships 
            WHERE coach_id = %s AND status = 'active'
        """, (current_user_id,))
        adherents = [row["athlete_id"] for row in cur.fetchall()]

        cost_str = "Free" if (not payload.cost_tnd or payload.cost_tnd == 0) else f"{payload.cost_tnd:g} TND"

        # 3. Notify and Send Chat Announcement to each adherent
        import json
        for ath_id in adherents:
            # Notification
            try:
                cur.execute("""
                    INSERT INTO notifications (user_id, sender_id, type, title, message, data)
                    VALUES (%s, %s, 'event_announcement', %s, %s, %s)
                """, (
                    ath_id,
                    current_user_id,
                    f"New Event: {payload.title}",
                    f"Coach {coach_name} posted a new event '{payload.title}' ({cost_str}). Check details and RSVP in Coach Zone!",
                    json.dumps({"event_id": event_id, "cost_tnd": payload.cost_tnd})
                ))
            except Exception as notif_err:
                print(f"[Events] Notification warning: {notif_err}", flush=True)

            # Chat Message in conversation
            try:
                chat_msg = (
                    f"New Event Announcement: \"{payload.title}\"\n"
                    f"Location: {payload.location_detail or 'Online'}\n"
                    f"Duration: {payload.duration_minutes} mins | Cost: {cost_str}\n"
                    f"Head over to Coach Zone Community Events to view details and RSVP!"
                )
                cur.execute("""
                    INSERT INTO chat_messages (sender_id, receiver_id, message)
                    VALUES (%s, %s, %s)
                """, (current_user_id, ath_id, chat_msg))
            except Exception as chat_err:
                print(f"[Events] Chat announcement warning: {chat_err}", flush=True)

        db.commit()

        return {"success": True, "event_id": event_id, "message": "Community event posted successfully!"}

@router.post("/upload-poster")
async def upload_event_poster(
    file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id)
):
    """Upload cover poster image for an event."""
    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"poster_{current_user_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOADS_EVENTS_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    poster_url = f"http://localhost:8000/api/uploads/events/{filename}"
    return {"poster_url": poster_url}

@router.post("/{event_id}/register")
def register_for_event(
    event_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Subscribe / Register current user for an event (adherents and non-adherents)."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Check event existence and capacity
        cur.execute("""
            SELECT e.id, e.max_participants, e.title,
                   (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'registered') as curr_count
            FROM events e WHERE e.id = %s
        """, (event_id,))
        ev = cur.fetchone()
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")

        if ev["max_participants"] and ev["curr_count"] >= ev["max_participants"]:
            raise HTTPException(status_code=400, detail="Event has reached maximum capacity")

        cur.execute("""
            INSERT INTO event_registrations (event_id, user_id, status)
            VALUES (%s, %s, 'registered')
            ON CONFLICT (event_id, user_id) 
            DO UPDATE SET status = 'registered', registered_at = NOW()
        """, (event_id, current_user_id))
        db.commit()

        return {"success": True, "message": f"Successfully registered for '{ev['title']}'!"}

@router.post("/{event_id}/unregister")
def unregister_from_event(
    event_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Cancel registration for an event."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            UPDATE event_registrations 
            SET status = 'cancelled'
            WHERE event_id = %s AND user_id = %s
        """, (event_id, current_user_id))
        db.commit()
        return {"success": True, "message": "Registration cancelled"}

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Delete an event (host coach only)."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT coach_id FROM events WHERE id = %s", (event_id,))
        ev = cur.fetchone()
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")
        if ev["coach_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Only the host coach can delete this event")

        cur.execute("DELETE FROM events WHERE id = %s", (event_id,))
        db.commit()
        return {"success": True, "message": "Event deleted successfully"}
