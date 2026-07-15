"""
HPI — Smart Recommendation Service
==========================================
Dynamic plan matching based on experience level and fitness goal.
"""
import json
import psycopg2
import psycopg2.extras
import math
import os
from typing import Dict, Any, List, Optional, Tuple

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import settings


# ── Comprehensive Plan Mapping ──────────────────────────────────────────
PLANS = {
    ("beginner", "muscle gain"): {
        "name": "Full Body Mass Builder",
        "source": "Muscle & Strength",
        "duration_weeks": 8,
        "days_per_week": 3,
        "schedule": {"Monday": "Full Body A", "Wednesday": "Full Body B", "Friday": "Full Body A"},
        "exercises": ["Barbell Squat", "Bench Press", "Deadlift", "Overhead Press", "Bent Over Row"],
        "equipment": "Barbells and dumbbells",
        "description": "3-day full body program hitting all major muscle groups with progressive overload. Ideal for building a foundation of size and strength."
    },
    ("beginner", "strength"): {
        "name": "8-Week Super Strength",
        "source": "Muscle & Strength",
        "duration_weeks": 8,
        "days_per_week": 5,
        "schedule": {"Monday": "Upper A", "Tuesday": "Lower A", "Wednesday": "Push", "Thursday": "Pull", "Friday": "Legs"},
        "exercises": ["Barbell Squat", "Deadlift", "Bench Press", "Overhead Press", "Barbell Row"],
        "equipment": "Barbells, dumbbells, machines",
        "description": "5-day strength-focused plan under 60 mins per session. Emphasises compound lifts with systematic progression."
    },
    ("beginner", "weight loss"): {
        "name": "3-Day Push/Pull/Legs",
        "source": "Muscle & Strength",
        "duration_weeks": 8,
        "days_per_week": 3,
        "schedule": {"Monday": "Push", "Wednesday": "Pull", "Friday": "Legs"},
        "exercises": ["Push-Up", "Dumbbell Row", "Goblet Squat", "Shoulder Press", "Romanian Deadlift"],
        "equipment": "Dumbbells, bodyweight",
        "description": "Simple PPL split 3 days/week. Builds strength, burns calories, and is easy to recover from. Pair with cardio on rest days."
    },
    ("beginner", "general fitness"): {
        "name": "Full Body Beginner Routine",
        "source": "Muscle & Strength",
        "duration_weeks": 6,
        "days_per_week": 3,
        "schedule": {"Monday": "Full Body", "Wednesday": "Full Body", "Friday": "Full Body"},
        "exercises": ["Goblet Squat", "Dumbbell Press", "Lat Pulldown", "Plank", "Dumbbell Lunges"],
        "equipment": "Dumbbells, cables",
        "description": "Perfect entry point for complete beginners. Low volume, full body focus, emphasis on learning proper form."
    },
    ("intermediate", "muscle gain"): {
        "name": "10-Week Mass Building Program",
        "source": "Muscle & Strength",
        "duration_weeks": 10,
        "days_per_week": 5,
        "schedule": {"Monday": "Chest", "Tuesday": "Back", "Wednesday": "Shoulders", "Thursday": "Arms", "Friday": "Legs"},
        "exercises": ["Incline Bench Press", "Deadlift", "Seated Shoulder Press", "EZ Bar Curl", "Leg Press"],
        "equipment": "Barbells, dumbbells, machines, cables",
        "description": "Heavy compound-focused bro split targeting each muscle group once per week with high volume. Best for intermediate lifters chasing size."
    },
    ("intermediate", "strength"): {
        "name": "6-Week Intermediate Mass & Strength",
        "source": "Muscle & Strength",
        "duration_weeks": 6,
        "days_per_week": 4,
        "schedule": {"Monday": "Workout 1", "Tuesday": "Workout 2", "Thursday": "Workout 3", "Friday": "Workout 4"},
        "exercises": ["Barbell Squat", "Romanian Deadlift", "Bench Press", "Pull-Up", "Military Press"],
        "equipment": "Barbells, dumbbells, cables",
        "description": "4-day split balancing strength and hypertrophy. Lower volume per session than beginner programs but higher intensity."
    },
    ("intermediate", "weight loss"): {
        "name": "6-Day Push/Pull/Legs Powerbuilding",
        "source": "Muscle & Strength",
        "duration_weeks": 8,
        "days_per_week": 6,
        "schedule": {"Monday": "Push", "Tuesday": "Pull", "Wednesday": "Legs", "Thursday": "Push", "Friday": "Pull", "Saturday": "Legs"},
        "exercises": ["Bench Press", "Barbell Row", "Leg Press", "Cable Fly", "Face Pull", "Leg Curl"],
        "equipment": "Barbells, cables, machines",
        "description": "High-frequency PPL for intermediate lifters. High caloric burn from 6 sessions/week while preserving muscle."
    },
    ("advanced", "muscle gain"): {
        "name": "8-Week Advanced Mass Program",
        "source": "Muscle & Strength",
        "duration_weeks": 8,
        "days_per_week": 6,
        "schedule": {"Monday": "Chest/Triceps", "Tuesday": "Back/Biceps", "Wednesday": "Legs", "Thursday": "Shoulders", "Friday": "Arms", "Saturday": "Full Body"},
        "exercises": ["Incline Barbell Press", "Weighted Pull-Up", "Barbell Squat", "Arnold Press", "Deadlift"],
        "equipment": "Barbells, dumbbells, cables, machines",
        "description": "High-volume 6-day split using drop sets, rest-pause, and slow negatives. For experienced lifters ready to push beyond plateaus."
    },
    ("advanced", "strength"): {
        "name": "8-Week Ultimate Strength Program",
        "source": "Muscle & Strength",
        "duration_weeks": 8,
        "days_per_week": 6,
        "schedule": {"Monday": "Day A", "Tuesday": "Day B", "Wednesday": "Day C", "Thursday": "Day A", "Friday": "Day B", "Saturday": "Day C"},
        "exercises": ["Barbell Squat", "Deadlift", "Bench Press", "Overhead Press", "Weighted Dip"],
        "equipment": "Barbells, power rack",
        "description": "6-day frequency program for advanced lifters. Trains each muscle group twice per week with increased volume and intensity."
    },
}


def calc_bmi(weight_kg: float, height_cm: float) -> float:
    if height_cm <= 0:
        return 0.0
    h_m = height_cm / 100.0
    return round(weight_kg / (h_m * h_m), 2)


def classify_bmi(bmi: float) -> str:
    if bmi < 18.5:    return "Underweight"
    elif bmi < 25.0:  return "Normal"
    elif bmi < 30.0:  return "Overweight"
    else:              return "Obese"


def find_recommendation(
    conn: psycopg2.extensions.connection,
    sex: str,
    age: int,
    weight_kg: float,
    height_cm: float,
    experience: str,
    goal: str,
    hypertension: str = "No",
    diabetes: str = "No",
) -> Dict[str, Any]:
    """
    Match user profile to personalized workout plan.
    Returns plan based on (experience, goal) tuple.
    Applies health condition modifications if needed.
    """
    # Normalize inputs
    exp_norm = experience.lower().strip()
    if exp_norm not in ("beginner", "intermediate", "advanced"):
        exp_norm = "beginner"
    
    goal_norm = goal.lower().strip()
    if goal_norm not in ("muscle gain", "strength", "weight loss", "general fitness"):
        goal_norm = "general fitness"
    
    hyp_norm = hypertension.lower() in ("yes", "true", "1")
    dia_norm = diabetes.lower() in ("yes", "true", "1")
    
    # Look up plan
    plan_key: Tuple[str, str] = (exp_norm, goal_norm)
    plan = PLANS.get(plan_key, PLANS[("beginner", "general fitness")])
    
    # Deep copy to avoid modifying original
    result_plan = {
        "name": plan["name"],
        "source": plan["source"],
        "duration_weeks": plan["duration_weeks"],
        "days_per_week": plan["days_per_week"],
        "schedule": dict(plan["schedule"]),
        "exercises": list(plan["exercises"]),
        "equipment": plan["equipment"],
        "description": plan["description"],
        "health_condition_note": None,
    }
    
    # Apply health condition modifications
    if hyp_norm or dia_norm:
        result_plan["days_per_week"] = min(3, result_plan["days_per_week"])
        # Remove deadlifts from exercises
        result_plan["exercises"] = [ex for ex in result_plan["exercises"] if "deadlift" not in ex.lower()]
        result_plan["health_condition_note"] = "Modified for health conditions: reduced frequency and intensity recommended."
    
    # Calculate BMI for profile info
    bmi = calc_bmi(weight_kg, height_cm)
    bmi_level = classify_bmi(bmi)
    
    return {
        "plan": result_plan,
        "profile": {
            "bmi": bmi,
            "bmi_level": bmi_level,
            "experience": exp_norm,
            "goal": goal_norm,
        }
    }


def seed_recommendation_rules(conn: psycopg2.extensions.connection) -> int:
    """Load rules from JSON into DB. Returns count."""
    rules_path = os.path.join(settings.DATA_DIR, "recommendation_rules.json")
    if not os.path.exists(rules_path):
        print(f"[SEED] Recommendation rules not found at {rules_path}")
        return 0

    # Check if already loaded
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM recommendation_rules")
        result = cur.fetchone()
        count = result['cnt'] if result else 0
    if count > 0:
        return count

    with open(rules_path) as f:
        rules = json.load(f)

    with conn.cursor() as cur:
        for r in rules:
            cur.execute(
                """INSERT INTO recommendation_rules
               (sex, bmi_level, goal, hypertension, diabetes, fitness_type, exercises, equipment, diet)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (r["sex"], r["level"], r["goal"], r["hypertension"], r["diabetes"],
                 r["fitness_type"], r["exercises"], r["equipment"], r["diet"])
            )
    print(f"[SEED] Loaded {len(rules)} recommendation rules")
    return len(rules)
