import os
import json
import logging
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env", override=False)

from database import get_db
from routes.auth import get_current_user_id

log = logging.getLogger("hpi.coach-ai-report")
router = APIRouter(prefix="", tags=["Coach AI Report Agent"])

class AIReportReq(BaseModel):
    prompt: Optional[str] = ""
    preset_token: Optional[str] = None

def verify_coach_and_athlete(coach_id: int, athlete_id: int, cur):
    cur.execute("SELECT role FROM users WHERE id = %s", (coach_id,))
    usr = cur.fetchone()
    if not usr or usr['role'] != 'coach':
        raise HTTPException(status_code=403, detail="Only coaches can generate AI reports.")

    cur.execute("""
        SELECT id FROM coach_relationships
        WHERE coach_id = %s AND athlete_id = %s AND status = 'active'
    """, (coach_id, athlete_id))
    if not cur.fetchone():
        raise HTTPException(status_code=403, detail="Athlete is not active on your roster.")

def fetch_athlete_full_context(athlete_id: int, coach_id: int, cur) -> dict:
    ctx = {}

    # 1. Profile
    cur.execute("""
        SELECT id, name, email, bodyweight, sex, age, height_cm, experience, goal
        FROM users WHERE id = %s
    """, (athlete_id,))
    ctx["profile"] = cur.fetchone() or {}

    # 2. Workouts (Last 30 days)
    cur.execute("""
        SELECT w.id, w.workout_name, w.session_date, w.duration_sec, w.notes,
               COALESCE(SUM(s.weight_kg * s.reps), 0) AS total_volume,
               COUNT(DISTINCT s.exercise_id) AS total_exercises,
               COUNT(s.id) AS total_sets
        FROM workouts w
        LEFT JOIN sets s ON s.workout_id = w.id
        WHERE w.user_id = %s
        GROUP BY w.id, w.workout_name, w.session_date, w.duration_sec, w.notes
        ORDER BY w.session_date DESC LIMIT 15
    """, (athlete_id,))
    ctx["recent_workouts"] = cur.fetchall() or []

    # 3. Top PRs / Set loads
    cur.execute("""
        SELECT e.name as exercise_name, MAX(s.weight_kg) as max_weight, MAX(s.one_rm_est) as top_est_1rm
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        JOIN exercises e ON s.exercise_id = e.id
        WHERE w.user_id = %s AND s.weight_kg > 0
        GROUP BY e.name
        ORDER BY max_weight DESC LIMIT 10
    """, (athlete_id,))
    ctx["prs"] = cur.fetchall() or []

    # 4. Nutrition logs (Last 14 days)
    cur.execute("""
        SELECT date::text, calories, protein_g, carbs_g, fat_g
        FROM nutrition_logs
        WHERE user_id = %s
        ORDER BY date DESC LIMIT 14
    """, (athlete_id,))
    ctx["nutrition_logs"] = cur.fetchall() or []

    # Target
    cur.execute("""
        SELECT final_calories, final_protein, final_carbs, final_fat, goal
        FROM nutrition_targets
        WHERE user_id = %s
        ORDER BY created_at DESC LIMIT 1
    """, (athlete_id,))
    ctx["nutrition_target"] = cur.fetchone() or {}

    # 5. Sleep logs (Last 14 days)
    cur.execute("""
        SELECT date::text, hours, quality, notes
        FROM sleep_logs
        WHERE user_id = %s
        ORDER BY date DESC LIMIT 14
    """, (athlete_id,))
    ctx["sleep_logs"] = cur.fetchall() or []

    # 6. Active Injuries
    cur.execute("""
        SELECT body_part, severity, description, status, start_date::text
        FROM injury_logs
        WHERE user_id = %s AND status = 'active'
        ORDER BY start_date DESC
    """, (athlete_id,))
    ctx["active_injuries"] = cur.fetchall() or []

    # 7. Recent Coach Notes
    cur.execute("""
        SELECT note, created_at::text
        FROM coach_notes
        WHERE athlete_id = %s AND coach_id = %s
        ORDER BY created_at DESC LIMIT 5
    """, (athlete_id, coach_id))
    ctx["coach_notes"] = cur.fetchall() or []

    return ctx

def build_report_prompt(athlete_name: str, payload: AIReportReq, ctx: dict) -> str:
    profile = ctx.get("profile", {})
    workouts = ctx.get("recent_workouts", [])
    nutrition = ctx.get("nutrition_logs", [])
    target = ctx.get("nutrition_target", {})
    sleep = ctx.get("sleep_logs", [])
    injuries = ctx.get("active_injuries", [])
    prs = ctx.get("prs", [])
    notes = ctx.get("coach_notes", [])

    total_vol = sum(w.get("total_volume", 0) for w in workouts)
    avg_sleep = (sum(s.get("hours", 0) for s in sleep) / len(sleep)) if sleep else None
    avg_cal = (sum(n.get("calories", 0) for n in nutrition) / len(nutrition)) if nutrition else None

    prompt_text = payload.prompt.strip() if payload.prompt else ""
    if payload.preset_token:
        prompt_text = f"[{payload.preset_token}] {prompt_text}"

    user_msg = f"""
You are acting as an Head Strength & Conditioning Coach and Sports Scientist analyzing athlete data.

ATHLETE PROFILE:
- Name: {profile.get('name', athlete_name)}
- Age: {profile.get('age', 'N/A')}, Gender: {profile.get('sex', 'M')}
- Bodyweight: {profile.get('bodyweight', 0)} kg, Height: {profile.get('height_cm', 0)} cm
- Experience Level: {profile.get('experience', 'Intermediate')}
- Primary Goal: {profile.get('goal', 'General Fitness')}

COACH DIRECTIVE / QUESTION:
"{prompt_text or 'Provide a comprehensive weekly training & recovery assessment report for this athlete.'}"

ATHLETE DATA PAYLOAD:
1. Workouts ({len(workouts)} sessions logged, {round(total_vol)} kg total volume):
{json.dumps(workouts, indent=2)}

2. Top PRs & Heavy Lifts:
{json.dumps(prs, indent=2)}

3. Nutrition Compliance ({len(nutrition)} days logged, target: {target.get('final_calories', 'N/A')} kcal):
{json.dumps(nutrition, indent=2)}

4. Sleep & Recovery Logs ({len(sleep)} nights logged, avg {round(avg_sleep, 1) if avg_sleep else 'N/A'} hrs):
{json.dumps(sleep, indent=2)}

5. Active Injuries & Limitations ({len(injuries)} active):
{json.dumps(injuries, indent=2)}

6. Past Coach Log Review Notes:
{json.dumps(notes, indent=2)}

REPORT STRUCTURE REQUIREMENTS:
Please generate a professional, cleanly formatted Markdown report with these exact section headers:

# Athlete Performance & Recovery Report: {profile.get('name', athlete_name)}

## Executive Summary
(2-3 high-impact sentences summarizing current state)

## Key Strengths & Performance Gains
(Bulleted analysis of strength, volume consistency, or compliance)

## Areas of Concern & Recovery Risks
(Highlight fatigue, sleep deficiencies, nutrition gaps, or active injuries)

## Actionable Coaching Plan for Next Week
(3-4 precise, actionable recommendations for training adjustments, nutrition tweaks, and injury protocols)

## Data Points Analyzed
- Workouts Analyzed: {len(workouts)} sessions ({round(total_vol)} kg volume)
- Nutrition Logs: {len(nutrition)} days (Avg: {round(avg_cal) if avg_cal else 0} kcal vs Target: {target.get('final_calories', 'N/A')} kcal)
- Sleep Logs: {len(sleep)} nights (Avg: {round(avg_sleep, 1) if avg_sleep else 'N/A'} hrs)
- Active Injuries: {len(injuries)} records

STRICT CONSTRAINTS:
- Be 100% grounded in the supplied data points above. Do not invent non-existent metrics.
- Keep tone professional, authoritative, encouraging, and clear.
"""
    return user_msg

@router.post("/coach/athlete/{athlete_id}/ai-report")
def generate_athlete_ai_report(
    athlete_id: int,
    payload: AIReportReq,
    coach_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        verify_coach_and_athlete(coach_id, athlete_id, cur)
        ctx = fetch_athlete_full_context(athlete_id, coach_id, cur)

    prompt = build_report_prompt(ctx.get("profile", {}).get("name", "Athlete"), payload, ctx)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert Strength & Conditioning Head Coach producing data-grounded athletic evaluation reports."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=3000
        )
        report_md = completion.choices[0].message.content.strip()

        workouts = ctx.get("recent_workouts", [])
        nutrition = ctx.get("nutrition_logs", [])
        sleep = ctx.get("sleep_logs", [])
        injuries = ctx.get("active_injuries", [])

        data_transparency = {
            "workouts_analyzed": len(workouts),
            "total_volume_kg": sum(w.get("total_volume", 0) for w in workouts),
            "nutrition_days_analyzed": len(nutrition),
            "sleep_nights_analyzed": len(sleep),
            "active_injuries": len(injuries)
        }

        return {
            "success": True,
            "report": report_md,
            "data_transparency": data_transparency
        }

    except Exception as e:
        log.error(f"Groq AI Report Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI Report generation error: {str(e)}")
