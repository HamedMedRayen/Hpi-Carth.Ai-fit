from fastapi import APIRouter, Depends, HTTPException
import psycopg2.extras
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationRead(BaseModel):
    id: int
    user_id: int
    sender_id: Optional[int]
    type: str
    title: str
    message: Optional[str]
    data: Optional[Dict[str, Any]]
    is_read: bool
    created_at: str

@router.get("", response_model=List[NotificationRead])
def get_notifications(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM notifications 
            WHERE user_id = %s 
            ORDER BY created_at DESC 
            LIMIT 50
        """, (user_id,))
        rows = cur.fetchall()
        for r in rows:
            if r["created_at"]:
                r["created_at"] = r["created_at"].isoformat()
        return rows

@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = %s AND user_id = %s
        """, (notification_id, user_id))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            DELETE FROM notifications 
            WHERE id = %s AND user_id = %s
        """, (notification_id, user_id))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.get("/unread-count")
def get_unread_count(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        return cur.fetchone()
