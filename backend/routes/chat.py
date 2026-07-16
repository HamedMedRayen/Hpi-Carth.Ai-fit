"""
HPI — Hpi AI Chat Route
POST /api/chat  →  Forward messages to Groq LLM and return assistant reply
"""
import os
import logging
from pathlib import Path
from typing import List, Literal

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from database import get_db
from routes.auth import get_current_user_id

# Load backend .env (ensures GROQ_API_KEY is available)
_BACKEND_DIR = Path(__file__).parent.parent
load_dotenv(_BACKEND_DIR / ".env", override=False)


log = logging.getLogger("hpi.chat")

router = APIRouter(tags=["Chat"])

# ── Request / Response schemas ────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

# ── System prompt ─────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are Hpi, an intelligent AI fitness coach embedded in Hpi. "
    "You help users with workout planning, exercise form, progressive overload "
    "strategies, recovery advice, and interpreting their training data. "
    "\n\n"
    "DATA TRACKING CAPABILITY:\n"
    "If a user tells you what they did for a workout or what they ate, you MUST log it for them. "
    "To log data, append a hidden action block at the VERY END of your response in this EXACT format:\n"
    "[ACTION: {\"type\": \"log_workout\", \"data\": {\"workout_name\": \"...\", \"sets\": [{\"exercise_name\": \"...\", \"weight_kg\": 0.0, \"reps\": 0, \"set_order\": \"1\"}]}}]\n"
    "OR for meals:\n"
    " [ACTION: {\"type\": \"log_meal\", \"description\": \"detailed description of the meal\"}]\n"
    "OR for water intake:\n"
    " [ACTION: {\"type\": \"log_water\", \"amount_ml\": 250}]\n"
    "\n"
    "For workouts, estimate the weights/reps if they are vague but common (e.g. 'bodyweight'). "
    "For meals, the system will calculate calories from your description. "
    "For water, use ml (a standard glass is 250ml).\n"
    "\n"
    "Be concise, motivating, and science-backed. Confirm to the user that you've tracked the data."
)

# ── POST /chat ────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_id: int = Depends(get_current_user_id),
    db = Depends(get_db)
):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        log.error("GROQ_API_KEY not set in environment")
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")

    try:
        from groq import Groq
        import json
        import re

        client = Groq(api_key=api_key)

        # Build messages array with system prompt prepended
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend([{"role": m.role, "content": m.content} for m in body.messages])

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
        )

        full_reply = completion.choices[0].message.content
        
        # ── Parse Actions ──────────────────────────────────────
        action_match = re.search(r"\[ACTION:\s*(\{.*?\})\]", full_reply, re.DOTALL)
        reply_to_user = full_reply
        
        if action_match:
            try:
                action_json = action_match.group(1)
                action = json.loads(action_json)
                reply_to_user = full_reply[:action_match.start()].strip()
                
                # Execute action
                if action.get("type") == "log_workout":
                    from routes.workouts import create_workout
                    from models.workout import WorkoutCreate, SetCreate
                    from datetime import datetime
                    
                    data = action.get("data", {})
                    payload = WorkoutCreate(
                        user_id=user_id,
                        workout_name=data.get("workout_name", "AI Tracked Workout"),
                        session_date=datetime.now().strftime("%Y-%m-%d"),
                        duration_sec=0,
                        notes="Tracked via Hpi Chat",
                        sets=[SetCreate(**s) for s in data.get("sets", [])]
                    )
                    create_workout(payload, db)
                    log.info(f"Hpi logged workout for user {user_id}")
                    
                elif action.get("type") == "log_meal":
                    from routes.nutrition import scan_meal, ScanRequest
                    scan_payload = ScanRequest(description=action.get("description", ""))
                    scan_meal(scan_payload, user_id, db)
                    log.info(f"Hpi logged meal for user {user_id}")
                
                elif action.get("type") == "log_water":
                    from routes.nutrition import log_water
                    water_payload = {"amount_ml": action.get("amount_ml", 250), "action": "add"}
                    log_water(water_payload, user_id, db)
                    log.info(f"Hpi logged water for user {user_id}")
                    
            except Exception as ae:
                log.error(f"Failed to execute Hpi action: {ae}", exc_info=True)

        return ChatResponse(reply=reply_to_user)

    except ImportError:
        log.error("groq package not installed — run: pip install groq")
        raise HTTPException(status_code=500, detail="groq package is not installed on the server.")
    except Exception as e:
        log.error(f"Groq API error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# Lazy-loaded pipeline
audio_pipeline = None

def get_audio_pipeline():
    global audio_pipeline
    if audio_pipeline is None:
        import torch
        from transformers import pipeline
        device = "cuda" if torch.cuda.is_available() else "cpu"
        log.info(f"Loading Whisper model on {device}...")
        audio_pipeline = pipeline("automatic-speech-recognition", model="TuniSpeech-AI/whisper-tunisian-dialect", device=device)
    return audio_pipeline

# ── POST /audio ────────────────────────────────────────────────
@router.post("/audio")
async def transcribe_audio(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id)
):
    import tempfile
    import os
    
    try:
        # Save uploaded file to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        pipe = get_audio_pipeline()
        
        # Transcribe
        result = pipe(tmp_path)
        
        # Clean up
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        
        text = result.get("text", "")
        return {"text": text.strip()}

    except Exception as e:
        log.error(f"Error processing audio locally: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error during audio processing.")
