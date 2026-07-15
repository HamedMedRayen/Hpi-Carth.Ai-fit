"""
HPI — /api/ai-recommend
Unified AI Workout Recommendation endpoint.
Uses real user data (history, fatigue, injuries, goals) + Groq LLM to generate
a deeply personalized workout plan. Falls back to AI-only if data is sparse.
"""
import os
import json
import logging
from pathlib import Path
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env", override=False)

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from database import get_db
from routes.auth import get_current_user_id

log = logging.getLogger("hpi.ai-recommend")
router = APIRouter(prefix="/ai-recommend", tags=["AI Recommend"])


class AIRecommendPayload(BaseModel):
    goal: str = "muscle_gain"          # muscle_gain | strength | fat_loss | general_fitness
    experience: str = "intermediate"   # beginner | intermediate | advanced
    days_available: int = 4
    gender: str = "Male"
    age: Optional[int] = None
    injuries: Optional[List[str]] = []
    extra_notes: Optional[str] = ""


def fetch_user_context(user_id: int, db) -> dict:
    """Pull relevant user data from DB to build AI context."""
    cursor = db.cursor()
    ctx = {}

    try:
        # Last 10 sessions with volume
        cursor.execute("""
            SELECT w.workout_name, w.session_date,
                   COALESCE(SUM(s.weight_kg * s.reps), 0) AS volume
            FROM workouts w
            LEFT JOIN exercises e ON e.workout_id = w.id
            LEFT JOIN sets s ON s.exercise_id = e.id
            WHERE w.user_id = %s
            GROUP BY w.id, w.workout_name, w.session_date
            ORDER BY w.session_date DESC LIMIT 10
        """, (user_id,))
        ctx["recent_sessions"] = cursor.fetchall() or []

        # Most trained muscle groups (top 5)
        cursor.execute("""
            SELECT ex.muscle_group, COUNT(*) as freq
            FROM exercises ex
            JOIN workouts w ON w.id = ex.workout_id
            WHERE w.user_id = %s AND ex.muscle_group IS NOT NULL
            GROUP BY ex.muscle_group ORDER BY freq DESC LIMIT 5
        """, (user_id,))
        ctx["top_muscles"] = [r["muscle_group"] for r in (cursor.fetchall() or [])]

        # Latest fatigue check
        cursor.execute("""
            SELECT label, borg_score FROM fatigue_checks
            WHERE user_id = %s ORDER BY logged_at DESC LIMIT 1
        """, (user_id,))
        ctx["latest_fatigue"] = cursor.fetchone()

        # Active injuries
        cursor.execute("""
            SELECT body_part, severity FROM injuries
            WHERE user_id = %s AND status = 'active'
        """, (user_id,))
        ctx["active_injuries"] = cursor.fetchall() or []

        # Total sessions & streak
        cursor.execute("""
            SELECT COUNT(*) as total,
                   MAX(session_date) as last_session
            FROM workouts WHERE user_id = %s
        """, (user_id,))
        ctx["stats"] = cursor.fetchone()

    except Exception as e:
        log.warning(f"Error fetching user context: {e}")
    finally:
        cursor.close()

    return ctx


def build_prompt(payload: AIRecommendPayload, ctx: dict) -> str:
    sessions = ctx.get("recent_sessions", [])
    top_muscles = ctx.get("top_muscles", [])
    fatigue = ctx.get("latest_fatigue")
    injuries = ctx.get("active_injuries", [])
    stats = ctx.get("stats")

    data_summary = ""

    if sessions:
        session_lines = "\n".join(
            f"  - {s['session_date']}: {s['workout_name']} ({int(s['volume'])}kg volume)"
            for s in sessions[:6]
        )
        data_summary += f"\nRecent training history:\n{session_lines}"

    if top_muscles:
        data_summary += f"\nMost trained muscle groups: {', '.join(top_muscles)}"

    if fatigue:
        data_summary += f"\nLatest fatigue check: {fatigue['label']} (Borg {fatigue['borg_score']}/20)"

    if injuries:
        inj_lines = ", ".join(f"{i['body_part']} (severity {i['severity']}/10)" for i in injuries)
        data_summary += f"\nActive injuries: {inj_lines}"

    if stats and stats["total"]:
        data_summary += f"\nTotal sessions logged: {stats['total']}"

    has_data = bool(sessions or top_muscles or injuries)

    base = (
        f"You are Hpi, an elite AI fitness coach inside the Hpi app. "
        f"Generate a detailed, personalized {payload.days_available}-day/week workout plan.\n\n"
        f"USER PROFILE:\n"
        f"- Goal: {payload.goal.replace('_', ' ').title()}\n"
        f"- Experience: {payload.experience.title()}\n"
        f"- Gender: {payload.gender}\n"
    )
    if payload.age:
        base += f"- Age: {payload.age}\n"
    if payload.injuries:
        base += f"- Self-reported limitations: {', '.join(payload.injuries)}\n"
    if payload.extra_notes:
        base += f"- Additional notes: {payload.extra_notes}\n"

    if has_data:
        base += f"\nTRAINING DATA FROM APP:{data_summary}\n"
        base += "\nUse this real training data to identify weaknesses, overworked muscles, recovery needs, and progression opportunities.\n"
    else:
        base += "\nNo training history available yet — generate a smart plan based purely on the profile.\n"

    base += f"""
RESPOND IN THIS EXACT JSON FORMAT (no markdown, no extra text):
{{
  "plan_name": "string",
  "split_type": "string (e.g. Push/Pull/Legs, Upper/Lower, Full Body)",
  "summary": "2-3 sentence personalized summary explaining WHY this plan suits this user's specific history and goals",
  "data_used": {str(has_data).lower()},
  "coaching_notes": ["note1", "note2", "note3"],
  "weekly_schedule": {{
    "Monday": "Exact Label of a Session or 'Rest'",
    "Tuesday": "Exact Label of a Session or 'Rest'",
    "Wednesday": "Exact Label of a Session or 'Rest'",
    "Thursday": "Exact Label of a Session or 'Rest'",
    "Friday": "Exact Label of a Session or 'Rest'",
    "Saturday": "Exact Label of a Session or 'Rest'",
    "Sunday": "Exact Label of a Session or 'Rest'"
  }},
  "sessions": [
    {{
      "label": "string (e.g. 'Upper Body A')",
      "focus": "string",
      "exercises": [
        {{"name": "string", "sets": number, "reps": "string", "rest_sec": number, "notes": "string"}},
        ...
      ]
    }}
  ]
}}

CRITICAL CONSTRAINTS:
1. The 'weekly_schedule' MUST have exactly {payload.days_available} days that are NOT 'Rest'.
2. The values in 'weekly_schedule' (other than 'Rest') MUST EXACTLY MATCH the 'label' of one of the objects in the 'sessions' array.
3. If the user has training data, adapt the volume and exercise selection to their current level and history.
4. Do not exceed or fall short of the requested {payload.days_available} days/week.
"""
    return base


@router.post("/")
async def ai_recommend(
    payload: AIRecommendPayload,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured.")

    # 1. Pull user context from DB
    ctx = fetch_user_context(user_id, db)

    # 2. Build the prompt
    prompt = build_prompt(payload, ctx)

    # 3. Call Groq
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an elite fitness coach. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=2500,
        )
        raw = completion.choices[0].message.content.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        if raw.endswith("```"):
            raw = raw[:-3]

        plan = json.loads(raw.strip())
        plan["data_used"] = bool(ctx.get("recent_sessions"))
        plan["fatigue_level"] = ctx["latest_fatigue"]["label"] if ctx.get("latest_fatigue") else None
        return plan

    except json.JSONDecodeError as e:
        log.error(f"JSON parse error from Groq: {e}")
        raise HTTPException(status_code=500, detail="AI returned malformed response. Try again.")
    except Exception as e:
        log.error(f"Groq error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
