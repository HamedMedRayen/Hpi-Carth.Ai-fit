"""
HPI — Exercise Service
==============================
Loads exercise catalog and body-part data from JSON files.
Populates the database on startup.
"""
import json
import psycopg2
import psycopg2.extras
import psycopg2.errors
import os
from typing import List, Dict, Any, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import settings

BODY_PARTS = ["Arms", "Legs", "Abs", "Chest", "Back", "Shoulders", "Calves", "Cardio", "Other"]

MUSCLE_TO_BODY_PART = {
    "Biceps": "Arms", "Triceps": "Arms", "Brachialis": "Arms",
    "Shoulders": "Shoulders",
    "Chest": "Chest", "Serratus anterior": "Chest",
    "Lats": "Back", "Trapezius": "Back", "Lower back": "Back",
    "Abs": "Abs", "Obliques": "Abs",
    "Quads": "Legs", "Hamstrings": "Legs", "Glutes": "Legs",
    "Calves": "Calves", "Soleus": "Calves",
}

# Curated exercise name map: uuid -> readable name (partial — for known ones)
UUID_NAMES: Dict[str, str] = {
    "1b020b3a-3732-4c7e-92fd-a0cec90ed69b": "Kettlebell Swing",
    "53906cd1-61f1-4d56-ac60-e4fcc5824861": "Hip Thrust",
    "f24cb758-9c0d-42d4-ad9e-6025c527dd13": "Dumbbell Lateral Raise",
    "f2733700-aa5d-4df7-bc52-1876ab4fb479": "Dumbbell Concentration Curl",
    "a6bced3c-72f5-42a3-9438-5569d46f49fd": "Barbell Side Bend",
}

# Canonical exercise library (always seeded, used for known names)
CANONICAL_EXERCISES = [
    # Chest
    {"name": "Bench Press (Barbell)",        "body_part": "Chest",     "primary": "Chest",     "equipment": "Barbell"},
    {"name": "Incline Bench Press (Barbell)", "body_part": "Chest",     "primary": "Chest",     "equipment": "Barbell"},
    {"name": "Decline Bench Press",           "body_part": "Chest",     "primary": "Chest",     "equipment": "Barbell"},
    {"name": "Chest Fly (Dumbbell)",          "body_part": "Chest",     "primary": "Chest",     "equipment": "Dumbbell"},
    {"name": "Incline Chest Fly (Dumbbell)",  "body_part": "Chest",     "primary": "Chest",     "equipment": "Dumbbell"},
    {"name": "Chest Press (Machine)",         "body_part": "Chest",     "primary": "Chest",     "equipment": "Machine"},
    {"name": "Incline Chest Press (Machine)", "body_part": "Chest",     "primary": "Chest",     "equipment": "Machine"},
    {"name": "Cable Fly",                     "body_part": "Chest",     "primary": "Chest",     "equipment": "Cable"},
    {"name": "Push-Up",                       "body_part": "Chest",     "primary": "Chest",     "equipment": "Bodyweight"},
    {"name": "Dips",                          "body_part": "Chest",     "primary": "Chest",     "equipment": "Bodyweight"},
    # Back
    {"name": "Deadlift (Barbell)",            "body_part": "Back",      "primary": "Lower back","equipment": "Barbell"},
    {"name": "Romanian Deadlift",             "body_part": "Back",      "primary": "Lower back","equipment": "Barbell"},
    {"name": "Pull-Up",                       "body_part": "Back",      "primary": "Lats",      "equipment": "Bodyweight"},
    {"name": "Chin-Up",                       "body_part": "Back",      "primary": "Lats",      "equipment": "Bodyweight"},
    {"name": "Lat Pulldown (Cable)",          "body_part": "Back",      "primary": "Lats",      "equipment": "Cable"},
    {"name": "Seated Row (Cable)",            "body_part": "Back",      "primary": "Lats",      "equipment": "Cable"},
    {"name": "Seated Row (Machine)",          "body_part": "Back",      "primary": "Lats",      "equipment": "Machine"},
    {"name": "T Bar Row",                     "body_part": "Back",      "primary": "Lats",      "equipment": "Barbell"},
    {"name": "Bent Over Row (Barbell)",       "body_part": "Back",      "primary": "Lats",      "equipment": "Barbell"},
    {"name": "Bent Over Row (Dumbbell)",      "body_part": "Back",      "primary": "Lats",      "equipment": "Dumbbell"},
    {"name": "Back Extension",                "body_part": "Back",      "primary": "Lower back","equipment": "Machine"},
    {"name": "Iso-Lateral Row (Machine)",     "body_part": "Back",      "primary": "Lats",      "equipment": "Machine"},
    {"name": "Shrug (Barbell)",               "body_part": "Back",      "primary": "Trapezius", "equipment": "Barbell"},
    {"name": "Shrug (Dumbbell)",              "body_part": "Back",      "primary": "Trapezius", "equipment": "Dumbbell"},
    {"name": "Inverted Row (Bodyweight)",     "body_part": "Back",      "primary": "Lats",      "equipment": "Bodyweight"},
    # Shoulders
    {"name": "Overhead Press (Barbell)",      "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Barbell"},
    {"name": "Seated Overhead Press (Dumbbell)","body_part":"Shoulders","primary": "Shoulders", "equipment": "Dumbbell"},
    {"name": "Shoulder Press (Machine)",      "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Machine"},
    {"name": "Shoulder Press (Plate Loaded)", "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Machine"},
    {"name": "Lateral Raise (Dumbbell)",      "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Dumbbell"},
    {"name": "Lateral Raise (Cable)",         "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Cable"},
    {"name": "Front Raise (Dumbbell)",        "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Dumbbell"},
    {"name": "Face Pull (Cable)",             "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Cable"},
    {"name": "Reverse Fly (Cable)",           "body_part": "Shoulders", "primary": "Shoulders", "equipment": "Cable"},
    # Arms
    {"name": "Bicep Curl (Barbell)",          "body_part": "Arms",      "primary": "Biceps",    "equipment": "Barbell"},
    {"name": "Bicep Curl (Dumbbell)",         "body_part": "Arms",      "primary": "Biceps",    "equipment": "Dumbbell"},
    {"name": "Bicep Curl (Machine)",          "body_part": "Arms",      "primary": "Biceps",    "equipment": "Machine"},
    {"name": "Hammer Curl (Dumbbell)",        "body_part": "Arms",      "primary": "Biceps",    "equipment": "Dumbbell"},
    {"name": "Preacher Curl (Barbell)",       "body_part": "Arms",      "primary": "Biceps",    "equipment": "Barbell"},
    {"name": "Tricep Pushdown (Cable)",       "body_part": "Arms",      "primary": "Triceps",   "equipment": "Cable"},
    {"name": "Triceps Extension (Cable)",     "body_part": "Arms",      "primary": "Triceps",   "equipment": "Cable"},
    {"name": "Triceps Extension",             "body_part": "Arms",      "primary": "Triceps",   "equipment": "Dumbbell"},
    {"name": "Skullcrusher (Barbell)",        "body_part": "Arms",      "primary": "Triceps",   "equipment": "Barbell"},
    {"name": "Skullcrusher (Dumbbell)",       "body_part": "Arms",      "primary": "Triceps",   "equipment": "Dumbbell"},
    {"name": "Bench Skullcrucher",            "body_part": "Arms",      "primary": "Triceps",   "equipment": "Barbell"},
    {"name": "Close Grip Bench Press",        "body_part": "Arms",      "primary": "Triceps",   "equipment": "Barbell"},
    # Legs
    {"name": "Squat (Barbell)",               "body_part": "Legs",      "primary": "Quads",     "equipment": "Barbell"},
    {"name": "Squat (Smith Machine)",         "body_part": "Legs",      "primary": "Quads",     "equipment": "Machine"},
    {"name": "Leg Press",                     "body_part": "Legs",      "primary": "Quads",     "equipment": "Machine"},
    {"name": "Leg Extension (Machine)",       "body_part": "Legs",      "primary": "Quads",     "equipment": "Machine"},
    {"name": "Leg Curl (Machine)",            "body_part": "Legs",      "primary": "Hamstrings","equipment": "Machine"},
    {"name": "Lying Leg Curl (Machine)",      "body_part": "Legs",      "primary": "Hamstrings","equipment": "Machine"},
    {"name": "One Leg Curl Plates Loaded",    "body_part": "Legs",      "primary": "Hamstrings","equipment": "Machine"},
    {"name": "Hip Thrust (Barbell)",          "body_part": "Legs",      "primary": "Glutes",    "equipment": "Barbell"},
    {"name": "Lunge (Barbell)",               "body_part": "Legs",      "primary": "Quads",     "equipment": "Barbell"},
    {"name": "Lunge (Dumbbell)",              "body_part": "Legs",      "primary": "Quads",     "equipment": "Dumbbell"},
    {"name": "Bulgarian Split Squat",         "body_part": "Legs",      "primary": "Quads",     "equipment": "Dumbbell"},
    {"name": "Sumo Deadlift",                 "body_part": "Legs",      "primary": "Glutes",    "equipment": "Barbell"},
    # Calves
    {"name": "Calf Raise (Machine)",          "body_part": "Calves",    "primary": "Calves",    "equipment": "Machine"},
    {"name": "Seated Calf Raise (Plate Loaded)","body_part":"Calves",   "primary": "Calves",    "equipment": "Machine"},
    {"name": "Standing Calf Raise (Barbell)", "body_part": "Calves",    "primary": "Calves",    "equipment": "Barbell"},
    {"name": "Standing Calf Raise (Bodyweight)","body_part":"Calves",   "primary": "Calves",    "equipment": "Bodyweight"},
    # Abs
    {"name": "Crunch",                        "body_part": "Abs",       "primary": "Abs",       "equipment": "Bodyweight"},
    {"name": "Plank",                         "body_part": "Abs",       "primary": "Abs",       "equipment": "Bodyweight"},
    {"name": "Cable Crunch",                  "body_part": "Abs",       "primary": "Abs",       "equipment": "Cable"},
    {"name": "Hanging Leg Raise",             "body_part": "Abs",       "primary": "Abs",       "equipment": "Bodyweight"},
    {"name": "Russian Twist",                 "body_part": "Abs",       "primary": "Abs",       "equipment": "Bodyweight"},
    # Cardio
    {"name": "Treadmill",                     "body_part": "Cardio",    "primary": "",          "equipment": "Machine"},
    {"name": "Cycling (Stationary)",          "body_part": "Cardio",    "primary": "",          "equipment": "Machine"},
    {"name": "Rowing Machine",                "body_part": "Cardio",    "primary": "",          "equipment": "Machine"},
    {"name": "Aerobics",                      "body_part": "Cardio",    "primary": "",          "equipment": "Bodyweight"},
    {"name": "Jump Rope",                     "body_part": "Cardio",    "primary": "",          "equipment": "Bodyweight"},
    # Misc
    {"name": "Back Cable Pull",               "body_part": "Back",      "primary": "Lats",      "equipment": "Cable"},
    {"name": "Dips ( Machine)",               "body_part": "Arms",      "primary": "Triceps",   "equipment": "Machine"},
]


def seed_body_parts(conn: psycopg2.extensions.connection) -> Dict[str, int]:
    """Ensure body_parts table is populated. Returns {name: id}."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        for bp in BODY_PARTS:
            try:
                cur.execute(
                    "INSERT INTO body_parts (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                    (bp,)
                )
            except psycopg2.errors.QueryCanceled:
                # Timeout during insert - skip and continue
                conn.rollback()
                print(f"[SEED] Warning: timeout inserting body part '{bp}', continuing anyway")
        try:
            cur.execute("SELECT id, name FROM body_parts")
            rows = cur.fetchall()
        except psycopg2.errors.QueryCanceled:
            print("[SEED] Warning: timeout selecting body parts, returning empty map")
            rows = []
    return {r["name"]: r["id"] for r in rows} if rows else {}


def seed_exercises(conn: psycopg2.extensions.connection) -> int:
    """Seed canonical exercises. Returns count inserted."""
    bp_map = seed_body_parts(conn)
    count = 0
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        for ex in CANONICAL_EXERCISES:
            bp_id = bp_map.get(ex["body_part"])
            try:
                cur.execute(
                    """INSERT INTO exercises
                   (name, body_part_id, muscle_group, equipment, primary_muscles, source)
                   VALUES (%s,%s,%s,%s,%s,'canonical')
                   ON CONFLICT (name) DO NOTHING""",
                    (ex["name"], bp_id, ex["primary"], ex["equipment"], ex["primary"])
                )
                count += 1
            except Exception:
                pass
    return count


def get_exercises_by_body_part(conn: psycopg2.extensions.connection, body_part: Optional[str] = None) -> List[Dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if body_part:
            cur.execute(
                """SELECT e.*, bp.name as body_part_name
               FROM exercises e
               LEFT JOIN body_parts bp ON e.body_part_id = bp.id
               WHERE bp.name = %s ORDER BY e.name""",
                (body_part,)
            )
        else:
            cur.execute(
                """SELECT e.*, bp.name as body_part_name
               FROM exercises e
               LEFT JOIN body_parts bp ON e.body_part_id = bp.id
               ORDER BY bp.name, e.name"""
            )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def get_all_body_parts(conn: psycopg2.extensions.connection) -> List[Dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT bp.id, bp.name,
           COUNT(e.id) as exercise_count
           FROM body_parts bp
           LEFT JOIN exercises e ON bp.id = e.body_part_id
           GROUP BY bp.id ORDER BY bp.name"""
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def get_custom_exercises_by_body_part(
    conn: psycopg2.extensions.connection, 
    user_id: int, 
    body_part: Optional[str] = None
) -> List[Dict]:
    """Get custom exercises for user, optionally filtered by body part."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if body_part:
            cur.execute(
                """SELECT id, user_id, name, body_part, primary_muscles, equipment, created_at,
                   true as is_custom FROM custom_exercises
                   WHERE user_id = %s AND body_part = %s
                   ORDER BY created_at DESC""",
                (user_id, body_part)
            )
        else:
            cur.execute(
                """SELECT id, user_id, name, body_part, primary_muscles, equipment, created_at,
                   true as is_custom FROM custom_exercises
                   WHERE user_id = %s
                   ORDER BY body_part, created_at DESC""",
                (user_id,)
            )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def create_custom_exercise(
    conn: psycopg2.extensions.connection,
    user_id: int,
    name: str,
    body_part: str,
    primary_muscles: Optional[List[str]] = None,
    equipment: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new custom exercise for the user."""
    primary_muscles = primary_muscles or []
    equipment = equipment or ""
    
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO custom_exercises 
               (user_id, name, body_part, primary_muscles, equipment)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING id, user_id, name, body_part, primary_muscles, equipment, created_at""",
            (user_id, name, body_part, primary_muscles, equipment)
        )
        row = cur.fetchone()
    return dict(row) if row else {}
