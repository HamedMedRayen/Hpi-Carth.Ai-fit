"""
HPI — Workout Plan Recommendation Engine
Intelligent plan selection based on user profile, health conditions, and availability.
"""

import json
import random
from pathlib import Path
from typing import Optional, Dict, Any
import psycopg2.extensions

# Load workout plans data
PLANS_PATH = Path(__file__).parent.parent / "data" / "workout_plans.json"
PLANS = json.loads(PLANS_PATH.read_text())


def get_recommendation(
    user_id: int,
    level: str,
    goal: str,
    days_available: int,
    hypertension: str,
    diabetes: str,
    last_plan_id: Optional[str],
    db: psycopg2.extensions.connection,
) -> Dict[str, Any]:
    """
    Recommend a workout plan based on user profile and health conditions.
    
    Args:
        user_id: User ID for history tracking
        level: Experience level (beginner/intermediate/advanced)
        goal: Training goal (muscle_gain/strength/general_fitness/fat_loss)
        days_available: Days per week user can train (2-6)
        hypertension: 'Yes' or 'No'
        diabetes: 'Yes' or 'No'
        last_plan_id: Previous plan ID to avoid repetition (None for first time)
        db: Database connection
    
    Returns:
        Selected workout plan dict with metadata
    """
    
    # Step 1: Filter by experience level and goal
    candidates = [p for p in PLANS if p["level"] == level and p["goal"] == goal]
    
    # Fallback if no exact match
    if not candidates:
        candidates = [
            p for p in PLANS
            if p["level"] == "beginner"
        ]
    
    # Step 2: Strict days matching
    exact = [p for p in candidates if p["days_per_week"] == days_available]
    if exact:
        candidates = exact
    else:
        under = sorted(
            [p for p in candidates if p["days_per_week"] <= days_available],
            key=lambda p: abs(p["days_per_week"] - days_available)
        )
        over = sorted(
            [p for p in candidates if p["days_per_week"] > days_available],
            key=lambda p: p["days_per_week"] - days_available
        )
        candidates = under[:3] or over[:3] or candidates
    
    # Step 3: Rotate out last plan if available
    if last_plan_id:
        rotated = [p for p in candidates if p["id"] != last_plan_id]
        if rotated:
            candidates = rotated
    
    # Step 4: Apply health modifications
    if hypertension == "Yes" or diabetes == "Yes":
        # For health conditions: prefer 3-day or less programs
        safe = [p for p in candidates if p["days_per_week"] <= 3]
        if safe:
            candidates = safe
        
        # Create modified copy of candidates to remove high-impact exercises
        modified_candidates = []
        for plan in candidates:
            plan_copy = json.loads(json.dumps(plan))  # Deep copy
            
            for session in plan_copy.get("sessions", []):
                # Remove heavy compound exercises that stress the cardiovascular system
                filtered_exercises = [
                    e for e in session.get("exercises", [])
                    if e["name"] not in ("Deadlift (Barbell)", "Barbell Squat")
                ]
                session["exercises"] = filtered_exercises
            
            plan_copy["health_note"] = (
                "Modified for health conditions: heavy compound exercises (squat, deadlift) "
                "have been replaced with safer alternatives."
            )
            modified_candidates.append(plan_copy)
        
        candidates = modified_candidates if modified_candidates else candidates
    
    # Step 5: Select plan randomly from filtered candidates
    chosen = random.choice(candidates)
    
    # Step 6: Record in recommendation history
    try:
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO recommendation_history (user_id, plan_id, shown_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                shown_at = NOW()
            """,
            (user_id, chosen["id"]),
        )
        db.commit()
        cursor.close()
    except Exception as e:
        print(f"Warning: Could not record recommendation history: {e}")
    
    return chosen
