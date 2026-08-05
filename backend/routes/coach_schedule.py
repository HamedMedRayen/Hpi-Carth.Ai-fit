from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import psycopg2.extras
import json

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Coach Schedule"])

class CreateScheduleItemReq(BaseModel):
    athlete_id: Optional[int] = None
    title: str
    item_type: Optional[str] = "session"  # 'session', 'availability_block', 'event'
    start_time: datetime
    end_time: datetime
    location: Optional[str] = "Gym"
    recurrence_rule: Optional[str] = None  # 'weekly', 'biweekly', 'daily', null
    recurrence_count: Optional[int] = 1

class UpdateScheduleItemReq(BaseModel):
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[str] = None  # 'scheduled', 'completed', 'cancelled'

def verify_coach_role(user_id: int, cur):
    cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    usr = cur.fetchone()
    if not usr or usr['role'] != 'coach':
        raise HTTPException(status_code=403, detail="Only coaches can manage the schedule.")

def check_conflict(coach_id: int, start_time: datetime, end_time: datetime, exclude_id: Optional[int], cur):
    cur.execute("""
        SELECT id, title, start_time::text as start_time, end_time::text as end_time 
        FROM coach_schedule_items
        WHERE coach_id = %s
          AND status != 'cancelled'
          AND start_time < %s AND end_time > %s
          AND (%s::bigint IS NULL OR id != %s)
        LIMIT 1
    """, (coach_id, end_time, start_time, exclude_id, exclude_id))
    return cur.fetchone()

@router.get("/coach/schedule")
def get_coach_schedule(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    coach_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Fetch all schedule items for a coach within a date range."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        verify_coach_role(coach_id, cur)

        query = """
            SELECT s.id, s.coach_id, s.athlete_id, s.title, s.item_type,
                   to_char(s.start_time, 'YYYY-MM-DD"T"HH24:MI:SS') as start_time,
                   to_char(s.end_time, 'YYYY-MM-DD"T"HH24:MI:SS') as end_time,
                   s.location, s.recurrence_rule, s.status, s.created_at::text as created_at,
                   u.name as athlete_name, u.avatar_url as athlete_avatar
            FROM coach_schedule_items s
            LEFT JOIN users u ON s.athlete_id = u.id
            WHERE s.coach_id = %s AND s.status != 'cancelled'
        """
        params = [coach_id]

        if start_date:
            query += " AND s.end_time >= %s::timestamptz"
            params.append(f"{start_date}T00:00:00Z")
        if end_date:
            query += " AND s.start_time <= %s::timestamptz"
            params.append(f"{end_date}T23:59:59Z")

        query += " ORDER BY s.start_time ASC"
        cur.execute(query, tuple(params))
        return cur.fetchall()

@router.post("/coach/schedule")
def create_schedule_item(
    payload: CreateScheduleItemReq,
    coach_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Book a session, availability block, or gym event with conflict check & recurrence."""
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time.")

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        verify_coach_role(coach_id, cur)

        # If athlete_id provided, verify active roster relationship
        if payload.athlete_id:
            cur.execute("""
                SELECT id FROM coach_relationships
                WHERE coach_id = %s AND athlete_id = %s AND status = 'active'
            """, (coach_id, payload.athlete_id))
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Athlete is not active on your roster.")

        duration = payload.end_time - payload.start_time
        count = max(1, min(payload.recurrence_count or 1, 12)) if payload.recurrence_rule else 1
        created_items = []

        for i in range(count):
            if payload.recurrence_rule == 'weekly':
                instance_start = payload.start_time + timedelta(weeks=i)
            elif payload.recurrence_rule == 'biweekly':
                instance_start = payload.start_time + timedelta(weeks=i * 2)
            elif payload.recurrence_rule == 'daily':
                instance_start = payload.start_time + timedelta(days=i)
            else:
                instance_start = payload.start_time
            
            instance_end = instance_start + duration

            # Conflict check
            conflict = check_conflict(coach_id, instance_start, instance_end, None, cur)
            if conflict:
                formatted_start = conflict['start_time'][:16].replace('T', ' ')
                formatted_end = conflict['end_time'][:16].replace('T', ' ')
                raise HTTPException(
                    status_code=409,
                    detail=f"Double-booking conflict on slot {instance_start.strftime('%b %d %H:%M')}: Exists '{conflict['title']}' ({formatted_start} - {formatted_end})."
                )

            cur.execute("""
                INSERT INTO coach_schedule_items (
                    coach_id, athlete_id, title, item_type, start_time, end_time, location, recurrence_rule, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'scheduled')
                RETURNING id, coach_id, athlete_id, title, item_type, 
                          start_time::text as start_time, end_time::text as end_time, location, recurrence_rule, status
            """, (
                coach_id, payload.athlete_id, payload.title.strip(), payload.item_type or 'session',
                instance_start, instance_end, payload.location, payload.recurrence_rule
            ))
            item = cur.fetchone()
            created_items.append(item)

            # Send notification to athlete if assigned
            if payload.athlete_id:
                formatted_date = instance_start.strftime('%A, %b %d at %H:%M')
                cur.execute("""
                    INSERT INTO notifications (user_id, sender_id, type, title, message, data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    payload.athlete_id,
                    coach_id,
                    'session_booked',
                    f"Coaching Session Booked: {payload.title}",
                    f"Your coach has scheduled '{payload.title}' for {formatted_date}.",
                    json.dumps({
                        "session_id": item["id"],
                        "start_time": item["start_time"],
                        "end_time": item["end_time"],
                        "location": payload.location
                    })
                ))

    db.commit()
    return {"success": True, "created": created_items}

@router.patch("/coach/schedule/{item_id}")
def update_schedule_item(
    item_id: int,
    payload: UpdateScheduleItemReq,
    coach_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Update or reschedule a session slot."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        verify_coach_role(coach_id, cur)

        cur.execute("SELECT * FROM coach_schedule_items WHERE id = %s AND coach_id = %s", (item_id, coach_id))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Schedule item not found.")

        new_start = payload.start_time or existing['start_time']
        new_end = payload.end_time or existing['end_time']

        if new_end <= new_start:
            raise HTTPException(status_code=400, detail="End time must be after start time.")

        # Check conflict if time changed
        if payload.start_time or payload.end_time:
            conflict = check_conflict(coach_id, new_start, new_end, item_id, cur)
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Reschedule conflict: Exists '{conflict['title']}' ({conflict['start_time'][:16]} - {conflict['end_time'][:16]})."
                )

        new_title = payload.title.strip() if payload.title else existing['title']
        new_location = payload.location if payload.location is not None else existing['location']
        new_status = payload.status if payload.status is not None else existing['status']

        cur.execute("""
            UPDATE coach_schedule_items
            SET title = %s, start_time = %s, end_time = %s, location = %s, status = %s
            WHERE id = %s AND coach_id = %s
            RETURNING id, title, item_type, start_time::text as start_time, end_time::text as end_time, location, status
        """, (new_title, new_start, new_end, new_location, new_status, item_id, coach_id))
        updated = cur.fetchone()

    db.commit()
    return {"success": True, "item": updated}

@router.delete("/coach/schedule/{item_id}")
def delete_schedule_item(
    item_id: int,
    coach_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Cancel / remove a schedule item."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        verify_coach_role(coach_id, cur)

        cur.execute("""
            UPDATE coach_schedule_items 
            SET status = 'cancelled'
            WHERE id = %s AND coach_id = %s
            RETURNING id
        """, (item_id, coach_id))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Schedule item not found.")

    db.commit()
    return {"success": True}

@router.get("/coach/my-sessions")
def get_athlete_upcoming_sessions(
    athlete_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    """Athlete endpoint to view their upcoming booked sessions."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT s.id, s.title, s.item_type,
                   s.start_time::text as start_time, s.end_time::text as end_time,
                   s.location, s.status, u.name as coach_name, u.avatar_url as coach_avatar
            FROM coach_schedule_items s
            JOIN users u ON s.coach_id = u.id
            WHERE s.athlete_id = %s 
              AND s.status = 'scheduled'
              AND s.end_time >= NOW() - INTERVAL '1 hour'
            ORDER BY s.start_time ASC
        """, (athlete_id,))
        return cur.fetchall()
