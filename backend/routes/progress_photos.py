from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import psycopg2.extras
import uuid
import os

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Progress Photos"])

# Make sure Supabase storage is configured, or we can use local for now
# For now, we'll store them locally if Supabase Storage isn't wired up yet
UPLOAD_DIR = "uploads/progress_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    date: str = Form(...),
    weight: Optional[float] = Form(None),
    note: Optional[str] = Form(None),
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    # Read file
    content = await file.read()
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file locally (in a real prod app, use Supabase Storage here)
    with open(filepath, "wb") as f:
        f.write(content)
        
    # Assuming standard FastAPI static files serving at /uploads
    photo_url = f"/api/uploads/progress_photos/{filename}"
    
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO progress_photos (user_id, photo_url, weight, date, note)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, photo_url, weight, date, note
        """, (user_id, photo_url, weight, date, note))
        result = cur.fetchone()
        
    return result

@router.get("")
def get_photos(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, photo_url, weight, date, note 
            FROM progress_photos 
            WHERE user_id = %s 
            ORDER BY date DESC
        """, (user_id,))
        return cur.fetchall()

@router.delete("/{photo_id}")
def delete_photo(photo_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        # Get URL to delete file
        cur.execute("SELECT photo_url FROM progress_photos WHERE id = %s AND user_id = %s", (photo_id, user_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Photo not found")
            
        url = row["photo_url"]
        if "/api/uploads/" in url:
            filepath = os.path.join("uploads", url.split("/api/uploads/")[1])
            if os.path.exists(filepath):
                os.remove(filepath)
                
        cur.execute("DELETE FROM progress_photos WHERE id = %s AND user_id = %s", (photo_id, user_id))
        
    return {"success": True}
