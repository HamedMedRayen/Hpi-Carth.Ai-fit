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

@router.get("/vapi/config")
async def get_vapi_config():
    """Return Vapi Public Key and Assistant ID configured in .env"""
    pub_key = (
        os.getenv("NEXT_PUBLIC_VAPI_API_KEY")
        or os.getenv("VAPI_PUBLIC_KEY")
        or os.getenv("VAPI_API_KEY")
        or os.getenv("REACT_APP_VAPI_PUBLIC_KEY")
        or ""
    )
    ast_id = (
        os.getenv("NEXT_PUBLIC_VAPI_ASSISTANT_ID")
        or os.getenv("VAPI_ASSISTANT_ID")
        or os.getenv("VAPI_MODEL_ID")
        or os.getenv("REACT_APP_VAPI_ASSISTANT_ID")
        or ""
    )
    return {"public_key": pub_key, "assistant_id": ast_id}



from typing import List, Literal, Optional, Dict, Any

# ── Request / Response schemas ────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
    exercise: Optional[Dict[str, Any]] = None

SYSTEM_PROMPT = """You are Hpi, the ambient agentic system operator for the athlete's training life.

=== ORIGIN STORY & MEANING ===
Origin Story: Every serious athlete eventually hits the same wall: their training log, their nutrition app, their sleep tracker, and their coach all live in different silos, speaking different languages. Progress gets lost in the gaps between them. Hpi was conceived not as another chatbot bolted onto a fitness app, but as the connective tissue between every number a lifter generates — sets, calories, hours of sleep, pain zones, PRs — so that no data point exists in isolation.
Name & Meaning: "Hpi" is short, sharp, and easy to say mid-set — deliberately un-corporate. It reads like a personal trainer's nickname, not a product name. The lowercase, glassmorphic "Hpi" logo mirrors the platform's own aesthetic: translucent, layered, always visible but never in the way.

=== WHAT HPI IS ===
Hpi isn't a generic assistant wearing a fitness skin. It's an agentic system operator for one person's training life. It doesn't just answer questions about progressive overload or recovery — it acts. Tell it "I did 3×8 bench at 80kg" or "I ate a chicken rice bowl," and it silently generates an action block that the backend parses and executes: a set gets logged, a macro target gets nudged closer to complete, without the athlete ever touching a form. Hpi's competency isn't measured in conversational fluency — it's measured in how much friction it removes between doing the work and recording the work.

=== PERSONALITY & VOICE ===
Hpi's tone should mirror the platform's philosophy: precise, encouraging, and quietly technical. It's the training partner who knows your Epley 1RM without being asked, notices your sleep dipped before your volume did, and flags it — not as a lecture, but as a coach would, in passing, mid-conversation. It's confident in exercise science but never condescending. It celebrates PRs like a genuine win, not a notification. When giving advice, training tips, or nutritional plans, back them up with their source or logical basis so the athlete knows exactly why they should follow it.

=== WHERE HPI LIVES ===
Hpi is always present — a floating presence across every view of the platform, from the Command Center dashboard to the Injury Map to the Coaching Zone. It's not a separate destination you visit; it's ambient, like a coach standing at the edge of the platform, watching the same dashboard you are.

=== HPI'S MANDATE ===
- Listen — parse natural language (typed or spoken) into structured fitness data.
- Act — log workouts, meals, and hydration on the athlete's behalf, invisibly.
- Correlate — connect sleep, nutrition, injury, and volume trends a human might miss.
- Coach — offer real technique, programming, and recovery guidance grounded in the athlete's own historical data, not generic advice. Always provide the source or scientific rationale for any recommendation or coaching advice you give (e.g. citing peer-reviewed sports science research, standard guidelines like ACSM/NSCA, or referencing specific historical data/trends from the athlete's logs).

=== DATA TRACKING CAPABILITY ===
If a user tells you what they did for a workout or what they ate, you MUST log it for them.
To log data, append a hidden action block at the VERY END of your response in this EXACT format:
[ACTION: {"type": "log_workout", "data": {"workout_name": "...", "sets": [{"exercise_name": "...", "weight_kg": 0.0, "reps": 0, "set_order": "1"}]}}]
OR for meals:
[ACTION: {"type": "log_meal", "description": "detailed description of the meal"}]
OR for water intake:
[ACTION: {"type": "log_water", "amount_ml": 250}]

For workouts, estimate the weights/reps if they are vague but common (e.g. 'bodyweight').
For meals, the system will calculate calories from your description.
For water, use ml (a standard glass is 250ml).

=== EXERCISE LOOKUP & GIF DISPLAY CAPABILITY ===
When a user asks to see an exercise, asks how to perform an exercise, or requests a visual guide/GIF for an exercise (e.g. 'Show me bench press', 'How to do push ups', 'Show me bicep curl GIF', 'What is squat'):
You MUST invoke the exercise lookup tool by appending a hidden action block at the VERY END of your response in this EXACT format:
[ACTION: {"type": "get_exercise", "query": "bench press"}]

Common exercises in database:
- Chest: Bench Press, Incline Bench Press, Decline Bench Press, Chest Fly, Push-Up, Dips, Cable Fly
- Back: Deadlift, Romanian Deadlift, Pull-Up, Chin-Up, Lat Pulldown, Seated Row, Bent Over Row, Shrug
- Shoulders: Overhead Press, Shoulder Press, Lateral Raise, Front Raise, Face Pull, Reverse Fly
- Arms: Bicep Curl, Hammer Curl, Preacher Curl, Tricep Pushdown, Triceps Extension, Skullcrusher, Close Grip Bench Press
- Legs: Squat, Leg Press, Leg Extension, Leg Curl, Lunge, Bulgarian Split Squat, Sumo Deadlift, Hip Thrust
- Calves: Calf Raise, Standing Calf Raise, Seated Calf Raise
- Abs & Core: Crunch, Plank, Cable Crunch, Hanging Leg Raise, Russian Twist

You can query any exercise name or ID. The backend will look it up directly and provide the GIF/image to display in the chat interface.

Be precise, encouraging, and quietly technical. Confirm to the user that you've tracked or retrieved the data.
"""

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

        import psycopg2.extras
        client = Groq(api_key=api_key)

        # Fetch user profile & onboarding data from database
        user_context_str = ""
        if user_id:
            try:
                with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                    user_row = cur.fetchone()

                if user_row:
                    onboarding_data = user_row.get("onboarding_data") or {}
                    if isinstance(onboarding_data, str):
                        try:
                            onboarding_data = json.loads(onboarding_data)
                        except Exception:
                            onboarding_data = {}

                    profile_details = []
                    if user_row.get("name"): profile_details.append(f"Name: {user_row['name']}")
                    if user_row.get("sex"): profile_details.append(f"Biological Sex: {user_row['sex']}")
                    if user_row.get("age"): profile_details.append(f"Age: {user_row['age']} years old")
                    if user_row.get("height_cm"): profile_details.append(f"Height: {user_row['height_cm']} cm")
                    if user_row.get("bodyweight"): profile_details.append(f"Current Bodyweight: {user_row['bodyweight']} kg")
                    if user_row.get("goal"): profile_details.append(f"Primary Goal: {user_row['goal']}")
                    if user_row.get("experience"): profile_details.append(f"Experience Level: {user_row['experience']}")
                    if user_row.get("hypertension"): profile_details.append(f"Hypertension: {user_row['hypertension']}")
                    if user_row.get("diabetes"): profile_details.append(f"Diabetes: {user_row['diabetes']}")

                    onboarding_details = []
                    if isinstance(onboarding_data, dict):
                        for k, v in onboarding_data.items():
                            if v is not None and v != "" and v != [] and v != {}:
                                if isinstance(v, dict):
                                    if "value" in v and "unit" in v:
                                        formatted_val = f"{v['value']} {v['unit']}"
                                    elif "selected" in v:
                                        sel = v['selected']
                                        if isinstance(sel, list):
                                            sel = ", ".join([str(s) for s in sel])
                                        other = v.get("otherText")
                                        formatted_val = f"{sel} ({other})" if other else str(sel)
                                    elif "year" in v:
                                        formatted_val = f"{v.get('day','--')}/{v.get('month','--')}/{v.get('year','--')}"
                                    else:
                                        formatted_val = json.dumps(v)
                                elif isinstance(v, list):
                                    formatted_val = ", ".join([str(item) for item in v])
                                else:
                                    formatted_val = str(v)

                                pretty_key = k.replace("_", " ").title()
                                onboarding_details.append(f"• {pretty_key}: {formatted_val}")

                    context_blocks = []
                    if profile_details:
                        context_blocks.append("Active Profile Summary:\n" + "\n".join([f"• {p}" for p in profile_details]))
                    if onboarding_details:
                        context_blocks.append("Detailed Onboarding Questionnaire Responses:\n" + "\n".join(onboarding_details))

                    if context_blocks:
                        user_context_str = "\n\n=== ATHLETE PROFILE & ONBOARDING DATA ===\n" + \
                            "You have direct access to the athlete's complete personal profile and 27-question onboarding responses below. Use this context to personalize all answers, workout advice, nutritional guidelines, and exercise programming specifically for them:\n\n" + \
                            "\n\n".join(context_blocks) + "\n=========================================\n"
            except Exception as e:
                log.warning(f"Could not load user onboarding context for chat: {e}")

        # Build messages array with system prompt prepended
        full_system_prompt = SYSTEM_PROMPT + user_context_str
        messages = [{"role": "system", "content": full_system_prompt}]
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
        found_exercise = None
        
        if action_match:
            try:
                action_json = action_match.group(1)
                action = json.loads(action_json)
                reply_to_user = full_reply[:action_match.start()].strip()
                
                # Execute action
                if action.get("type") == "get_exercise":
                    from services.exercise_service import get_exercise_by_id_or_name
                    query = action.get("query") or action.get("name") or action.get("id")
                    if query:
                        found_exercise = get_exercise_by_id_or_name(db, query)
                        log.info(f"Hpi fetched exercise for query '{query}': {found_exercise.get('name') if found_exercise else 'not found'}")

                elif action.get("type") == "log_workout":
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

        # Fallback check: if user asked for exercise GIF/demonstration and action wasn't triggered
        if not found_exercise and body.messages:
            last_user_msg = body.messages[-1].content.strip()
            if any(w in last_user_msg.lower() for w in ["gif", "show", "how to", "demonstrate", "exercise", "picture", "photo", "image", "guide", "visual"]):
                from services.exercise_service import get_exercise_by_id_or_name
                search_text = last_user_msg
                # If short query like "picture" or "show picture", look back at recent user messages
                if len(last_user_msg.split()) <= 4:
                    user_texts = [m.content for m in body.messages if m.role == "user"]
                    search_text = " ".join(user_texts[-3:]) if user_texts else last_user_msg

                clean_q = re.sub(r"(?i)\b(show|me|how|to|do|a|an|the|gif|video|picture|photo|image|guide|visual|demonstrate|exercise|please|what|is)\b", "", search_text).strip()
                if clean_q:
                    found_exercise = get_exercise_by_id_or_name(db, clean_q)

        return ChatResponse(reply=reply_to_user, exercise=found_exercise)



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
