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
GROQ_CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-120b")

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

class VapiSyncItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class VapiSyncRequest(BaseModel):
    transcripts: List[VapiSyncItem]

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

=== WORKOUT & DIET PLAN FORMATTING & FILE EXPORT CAPABILITY ===
When formulating workout routines, splits, training programs, or comprehensive diet and meal plans:
1. Present them in clean, structured Markdown (using headers `# Title`, `## Day 1 - ...`, `### Exercises & Targets`, tables `| Exercise | Sets | Reps | RPE | Rest |`, bullet points, and daily macro targets).
2. If the user asks for a file, an export, or mentions `.md`, `.txt`, or `.pdf` format (e.g., "give me a .md file", "give me a pdf file", "export this diet plan as pdf/txt", "give me a downloadable plan"):
   - Structure the entire plan inside a clean Markdown document / fenced block with clear title and sections so it can be exported as a standalone file.
   - Mention to the user that they can download or print it directly as a `.md`, `.txt`, or `.pdf` file or copy it using the export buttons below the message.

Be precise, encouraging, and quietly technical. Confirm to the user that you've tracked or retrieved the data.
"""

def should_trigger_rag(query: str) -> bool:
    """Determine whether RAG vector search should be triggered for a user query."""
    if not query or len(query.strip()) < 6:
        return False

    q_lower = query.lower().strip()

    # 1. Skip RAG for clear data logging or tracking requests
    logging_keywords = [
        "log", "logged", "ate", "eating", "drink", "drank", "water", "workout",
        "sets", "reps", "bench", "squat", "deadlift", "meal", "food", "track",
        "tracked", "breakfast", "lunch", "dinner", "snack", "kcal", "calories",
        "grams", "kg", "lbs"
    ]
    science_keywords = [
        "why", "how does", "explain", "study", "research", "science", "article",
        "paper", "mechanism", "optimal", "hypertrophy", "physiology", "program",
        "recommend", "protocol"
    ]

    if any(k in q_lower for k in logging_keywords):
        if not any(sk in q_lower for sk in science_keywords):
            return False

    # 2. Skip RAG for simple greetings or casual conversational filler
    greetings = ["hi", "hello", "hey", "good morning", "good evening", "thanks", "thank you", "bye", "ok", "okay", "yes", "no"]
    if q_lower in greetings or any(q_lower.startswith(g) for g in ["hi ", "hello ", "hey "]):
        return False

    # 3. Skip RAG for exercise GIF / media lookup
    if any(w in q_lower for w in ["gif", "picture", "photo", "image", "show me exercise", "show gif"]):
        return False

    return True


def build_user_hpi_context(user_id: Optional[int], db, last_user_msg: str = "") -> dict:
    """Helper function to load user profile, onboarding responses, RAG context, and build full Hpi system prompt."""
    import json
    import psycopg2.extras

    user_name = "Athlete"
    user_context_str = ""
    if user_id:
        try:
            with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user_row = cur.fetchone()

            if user_row:
                if user_row.get("name"):
                    user_name = user_row["name"].split()[0]
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
                        "You have direct access to the athlete's complete personal profile and onboarding responses below. Use this context to personalize all answers, workout advice, nutritional guidelines, and exercise programming specifically for them:\n\n" + \
                        "\n\n".join(context_blocks) + "\n=========================================\n"
        except Exception as e:
            log.warning(f"Could not load user onboarding context for chat: {e}")

    rag_context = ""
    if last_user_msg and should_trigger_rag(last_user_msg):
        try:
            from pipeline.retrieval_pipeline import get_context_for_question
            log.info(f"Triggering RAG vector search for question: '{last_user_msg}'")
            rag_context = get_context_for_question(last_user_msg)
        except Exception as e:
            log.warning(f"RAG retrieval failed (non-fatal): {e}")

    full_system_prompt = SYSTEM_PROMPT + user_context_str + rag_context
    first_message = f"Hey {user_name}! I'm Hpi, your AI fitness coach. I'm connected to your profile and training logs. How is your training going today?"

    return {
        "user_name": user_name,
        "system_prompt": full_system_prompt,
        "first_message": first_message,
        "user_context_str": user_context_str,
        "rag_context": rag_context
    }


def resolve_valid_user_id(user_id: Optional[int], db) -> int:
    """Ensure a valid user ID is returned for DB insertions with foreign key constraints."""
    if user_id and isinstance(user_id, int) and user_id > 0:
        return user_id
    try:
        import psycopg2.extras
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1")
            row = cur.fetchone()
            if row and row.get("id"):
                return int(row["id"])
    except Exception as e:
        log.warning(f"Could not resolve active user id from DB: {e}")
    return 5


def execute_action_from_reply(full_reply: str, db, user_id: Optional[int], user_input: str = "") -> tuple:
    """Parses [ACTION: ...] block from AI reply and executes backend mutation."""
    import json
    import re

    reply_to_user = full_reply
    found_exercise = None
    action_type = None
    target_user_id = resolve_valid_user_id(user_id, db)

    # Search for [ACTION: ...] block with potential multi-line / nested braces
    action_match = re.search(r"\[ACTION:\s*(\{.*\})\s*\]", full_reply, re.DOTALL)
    
    # Fallback check if user input requests logging but LLM missed appending action block
    if not action_match and user_input and any(k in user_input.lower() for k in ["log", "ate", "workout", "sets", "reps", "bench", "squat", "water", "drink", "meal", "food", "track"]):
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            try:
                from groq import Groq
                client = Groq(api_key=api_key)
                extractor_prompt = """You are Hpi's data tracking parser.
Extract workout, meal, or water logging intent from the user input.
Output ONLY one of these exact hidden action blocks:
[ACTION: {"type": "log_workout", "data": {"workout_name": "...", "sets": [{"exercise_name": "...", "weight_kg": 0.0, "reps": 0}]}}]
OR
[ACTION: {"type": "log_meal", "description": "..."}]
OR
[ACTION: {"type": "log_water", "amount_ml": 250}]

If no clear logging intent, output NONE."""
                comp = client.chat.completions.create(
                    model=GROQ_CHAT_MODEL,
                    messages=[{"role": "system", "content": extractor_prompt}, {"role": "user", "content": user_input}],
                    temperature=0.1
                )
                ext_reply = comp.choices[0].message.content.strip()
                action_match = re.search(r"\[ACTION:\s*(\{.*\})\s*\]", ext_reply, re.DOTALL)
            except Exception as ex:
                log.warning(f"Fallback action extractor failed: {ex}")

    if action_match:
        raw_json_candidate = action_match.group(1).strip()
        # Parse balanced JSON object
        brace_count = 0
        start_idx = -1
        end_idx = -1
        for i, char in enumerate(raw_json_candidate):
            if char == '{':
                if brace_count == 0:
                    start_idx = i
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break

        if start_idx != -1 and end_idx != -1:
            json_str = raw_json_candidate[start_idx:end_idx]
            try:
                action = json.loads(json_str)
                if "[ACTION:" in full_reply:
                    reply_to_user = full_reply[:action_match.start()].strip()
                action_type = action.get("type")

                if action_type == "get_exercise":
                    from services.exercise_service import get_exercise_by_id_or_name
                    query = action.get("query") or action.get("name") or action.get("id")
                    if query:
                        found_exercise = get_exercise_by_id_or_name(db, query)
                        log.info(f"Hpi fetched exercise for query '{query}': {found_exercise.get('name') if found_exercise else 'not found'}")

                elif action_type == "log_workout":
                    from routes.workouts import create_workout
                    from models.workout import WorkoutCreate, SetCreate
                    from datetime import datetime
                    
                    data = action.get("data", {})
                    sets_input = data.get("sets", [])
                    valid_sets = []
                    for idx, s in enumerate(sets_input):
                        if isinstance(s, dict):
                            ex_name = s.get("exercise_name") or s.get("exercise") or "General Exercise"
                            w_kg = float(s.get("weight_kg") or s.get("weight") or 0.0)
                            r_cnt = int(s.get("reps") or 1)
                            s_ord = str(s.get("set_order") or idx + 1)
                            rpe_val = float(s.get("rpe")) if s.get("rpe") is not None else None
                            valid_sets.append(SetCreate(
                                exercise_name=ex_name,
                                weight_kg=w_kg,
                                reps=r_cnt,
                                set_order=s_ord,
                                rpe=rpe_val
                            ))
                    
                    if not valid_sets:
                        valid_sets = [SetCreate(exercise_name="Bodyweight Training", weight_kg=0.0, reps=10, set_order="1")]

                    payload = WorkoutCreate(
                        user_id=target_user_id,
                        workout_name=data.get("workout_name", "AI Tracked Workout"),
                        session_date=datetime.now().strftime("%Y-%m-%d"),
                        duration_sec=0,
                        notes="Tracked via Hpi AI Voice/Chat",
                        sets=valid_sets
                    )
                    create_workout(payload=payload, current_user_id=target_user_id, db=db)
                    db.commit()
                    log.info(f"Hpi logged workout for user {target_user_id}: {payload.workout_name} with {len(valid_sets)} sets")

                elif action_type == "log_meal":
                    from routes.nutrition import scan_meal, ScanRequest
                    desc = action.get("description") or action.get("meal_name") or action.get("meal") or "Meal"
                    scan_payload = ScanRequest(description=desc)
                    scan_meal(payload=scan_payload, user_id=target_user_id, db=db)
                    db.commit()
                    log.info(f"Hpi logged meal for user {target_user_id}: {desc}")

                elif action_type == "log_water":
                    from routes.nutrition import log_water
                    amount = int(action.get("amount_ml") or action.get("amount") or 250)
                    water_payload = {"amount_ml": amount, "action": "add"}
                    log_water(payload=water_payload, user_id=target_user_id, db=db)
                    db.commit()
                    log.info(f"Hpi logged water for user {target_user_id}: {amount}ml")

            except Exception as ae:
                log.error(f"Failed to execute Hpi action: {ae}", exc_info=True)
                try:
                    db.rollback()
                except Exception:
                    pass

    return reply_to_user, found_exercise, action_type


# ── GET /vapi/context ─────────────────────────────────────────
@router.get("/vapi/context")
async def get_vapi_context(
    user_id: int = Depends(get_current_user_id),
    db = Depends(get_db)
):
    """
    Returns app context, user profile summary, RAG context, and Vapi assistantOverrides
    so Vapi Voice Call operates directly with Hpi's LLM personality and user state.
    """
    ctx = build_user_hpi_context(user_id=user_id, db=db)
    
    assistant_overrides = {
        "firstMessage": ctx["first_message"],
        "variableValues": {
            "user_name": ctx["user_name"]
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": ctx["system_prompt"]
                }
            ]
        }
    }

    return {
        "user_name": ctx["user_name"],
        "first_message": ctx["first_message"],
        "system_prompt": ctx["system_prompt"],
        "assistant_overrides": assistant_overrides
    }


# ── POST /vapi/custom-llm ────────────────────────────────────
@router.post("/vapi/custom-llm")
async def vapi_custom_llm(
    request_body: Dict[str, Any],
    user_id: int = Depends(get_current_user_id),
    db = Depends(get_db)
):
    """
    OpenAI chat completions compatible endpoint for Vapi Custom LLM feature.
    Allows Vapi to use Hpi's backend LLM with full app context and action capabilities.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured.")

    from groq import Groq
    client = Groq(api_key=api_key)

    raw_messages = request_body.get("messages", [])
    last_user_msg = ""
    for m in reversed(raw_messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "").strip()
            break

    ctx = build_user_hpi_context(user_id=user_id, db=db, last_user_msg=last_user_msg)
    
    full_messages = [{"role": "system", "content": ctx["system_prompt"]}]
    for m in raw_messages:
        if m.get("role") in ["user", "assistant"]:
            full_messages.append({"role": m.get("role"), "content": m.get("content", "")})

    completion = client.chat.completions.create(
        model=GROQ_CHAT_MODEL,
        messages=full_messages,
        temperature=0.7
    )

    full_reply = completion.choices[0].message.content
    reply_text, _, _ = execute_action_from_reply(full_reply, db, user_id, user_input=last_user_msg)

    return {
        "id": "vapi-custom-llm-res",
        "object": "chat.completion",
        "created": int(os.environ.get("TIMESTAMP", 1700000000)),
        "model": GROQ_CHAT_MODEL,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": reply_text
                },
                "finish_reason": "stop"
            }
        ]
    }


# ── POST /chat/sync-vapi ──────────────────────────────────────
@router.post("/chat/sync-vapi")
async def sync_vapi_transcript(
    body: VapiSyncRequest,
    user_id: int = Depends(get_current_user_id),
    db = Depends(get_db)
):
    """
    Receives voice call conversation transcripts from Vapi, stores them into user context,
    and executes any spoken tracking commands (log workout, log meal, log water).
    """
    actions_triggered = []
    processed_count = 0

    api_key = os.getenv("GROQ_API_KEY")
    client = None
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
        except Exception:
            pass

    for item in body.transcripts:
        if item.role == "user" and item.content.strip():
            processed_count += 1
            user_text = item.content.strip()
            
            # Check if user text implies tracking intent
            if client and any(k in user_text.lower() for k in ["log", "ate", "workout", "sets", "reps", "bench", "squat", "water", "drink", "meal", "food", "track"]):
                try:
                    ctx = build_user_hpi_context(user_id=user_id, db=db, last_user_msg=user_text)
                    messages = [
                        {"role": "system", "content": ctx["system_prompt"]},
                        {"role": "user", "content": user_text}
                    ]
                    comp = client.chat.completions.create(
                        model=GROQ_CHAT_MODEL,
                        messages=messages,
                        temperature=0.3
                    )
                    reply = comp.choices[0].message.content
                    _, _, act_type = execute_action_from_reply(reply, db, user_id, user_input=user_text)
                    if act_type:
                        actions_triggered.append(act_type)
                except Exception as ex:
                    log.warning(f"Error checking tracking action from Vapi transcript: {ex}")

    return {
        "success": True,
        "processed_count": processed_count,
        "actions_triggered": actions_triggered
    }


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
        raise HTTPException(status_code=500, detail="AI service is not configured on the server.")

    try:
        from groq import Groq
        import json
        import re

        client = Groq(api_key=api_key)

        last_user_msg = body.messages[-1].content.strip() if body.messages else ""
        ctx = build_user_hpi_context(user_id=user_id, db=db, last_user_msg=last_user_msg)

        # Build messages array with system prompt prepended
        messages = [{"role": "system", "content": ctx["system_prompt"]}]
        messages.extend([{"role": m.role, "content": m.content} for m in body.messages])

        completion = client.chat.completions.create(
            model=GROQ_CHAT_MODEL,
            messages=messages,
            temperature=0.7,
        )

        full_reply = completion.choices[0].message.content
        reply_to_user, found_exercise, _ = execute_action_from_reply(full_reply, db, user_id, user_input=last_user_msg)

        # Fallback check: if user asked for exercise GIF/demonstration and action wasn't triggered
        if not found_exercise and body.messages:
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
        raise HTTPException(status_code=500, detail="AI service dependency is missing on the server.")
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
