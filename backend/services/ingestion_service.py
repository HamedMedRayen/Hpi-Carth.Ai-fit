"""
HPI — Data Ingestion Service
===================================
Loads the Strong CSV export (semicolon-delimited) using
pure Python file I/O — zero pandas, zero numpy.

Pipeline:
  1. Read & parse CSV
  2. Filter to working sets only (exclude warmups & rest timers)
  3. Compute 1RM estimates (Epley formula) and volume load
  4. Persist to PostgreSQL via repository layer
  5. Compute and persist per-session Metrics
  6. Upsert Personal Records
"""

import sys
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import math

# Resolve project root
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from data_engine.engine import MathUtils, StatEngine


# ─────────────────────────────────────────────────────────────
# CSV Parsing
# ─────────────────────────────────────────────────────────────

def _clean(val: str) -> str:
    return val.strip().strip('"').strip()


def parse_csv(filepath: str) -> List[Dict[str, str]]:
    """
    Parse the Strong semicolon-delimited CSV.
    Returns list of dicts keyed by header names.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"CSV not found: {filepath}")

    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        lines = f.readlines()

    if not lines:
        return rows

    # Header row
    headers = [_clean(h) for h in lines[0].split(";")]

    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split(";")
        if len(parts) < len(headers):
            parts += [""] * (len(headers) - len(parts))
        row = {headers[i]: _clean(parts[i]) for i in range(len(headers))}
        rows.append(row)

    return rows


def _safe_float(val: str, default: float = 0.0) -> float:
    try:
        return float(val) if val else default
    except (ValueError, TypeError):
        return default


def _safe_int(val: str, default: int = 0) -> int:
    try:
        return int(float(val)) if val else default
    except (ValueError, TypeError):
        return default


# ─────────────────────────────────────────────────────────────
# Muscle group inference (heuristic)
# ─────────────────────────────────────────────────────────────

MUSCLE_MAP: Dict[str, str] = {
    # Chest
    "bench press": "chest",
    "chest press": "chest",
    "chest fly": "chest",
    "pec deck": "chest",
    "push up": "chest",
    "dip": "chest",

    # Back
    "pull up": "back",
    "pullup": "back",
    "chin up": "back",
    "row": "back",
    "lat pulldown": "back",
    "deadlift": "back",
    "pulldown": "back",
    "shrug": "back",

    # Shoulders
    "overhead press": "shoulders",
    "shoulder press": "shoulders",
    "lateral raise": "shoulders",
    "front raise": "shoulders",
    "face pull": "shoulders",
    "upright row": "shoulders",

    # Arms
    "curl": "biceps",
    "tricep": "triceps",
    "pushdown": "triceps",
    "extension": "triceps",
    "skull crusher": "triceps",
    "hammer": "biceps",

    # Legs
    "squat": "quads",
    "leg press": "quads",
    "lunge": "quads",
    "leg extension": "quads",
    "leg curl": "hamstrings",
    "romanian": "hamstrings",
    "rdl": "hamstrings",
    "calf": "calves",
    "hip thrust": "glutes",
    "glute": "glutes",

    # Core
    "plank": "core",
    "crunch": "core",
    "ab": "core",
    "cable crunch": "core",
}


def infer_muscle_group(exercise_name: str) -> str:
    name_lower = exercise_name.lower()
    for keyword, muscle in MUSCLE_MAP.items():
        if keyword in name_lower:
            return muscle
    return "other"


# ─────────────────────────────────────────────────────────────
# Per-session aggregation
# ─────────────────────────────────────────────────────────────

def aggregate_session(
    sets: List[Dict[str, Any]],
    bodyweight: float = 80.0,
) -> Dict[str, Any]:
    """
    Compute session-level metrics from a list of set dicts.
    Each set must have: weight_kg, reps, one_rm_est, volume_load, exercise_name
    """
    working = [s for s in sets if s.get("set_order") not in ("W", "Rest Timer", "")]
    if not working:
        return {
            "total_volume": 0.0, "total_sets": 0, "total_reps": 0,
            "avg_intensity": 0.0, "max_1rm": 0.0,
            "dominant_exercise": "", "fatigue_index": 0.0, "inol": 0.0,
        }

    total_volume = sum(s["volume_load"] for s in working)
    total_sets = len(working)
    total_reps = sum(s["reps"] for s in working)
    max_1rm = max(s["one_rm_est"] for s in working) if working else 0.0

    # Dominant exercise by volume
    ex_vol: Dict[str, float] = {}
    for s in working:
        n = s.get("exercise_name", "")
        ex_vol[n] = ex_vol.get(n, 0.0) + s["volume_load"]
    dominant = max(ex_vol, key=ex_vol.get) if ex_vol else ""

    # Average relative intensity across sets
    intensities = []
    for s in working:
        if s["one_rm_est"] > 0 and s["weight_kg"] > 0:
            intensities.append(s["weight_kg"] / s["one_rm_est"])
    avg_intensity = StatEngine.mean(intensities) if intensities else 0.0

    # Fatigue index: first vs last set of dominant exercise
    dom_sets = [s for s in working if s.get("exercise_name") == dominant]
    fatigue = 0.0
    if len(dom_sets) >= 2:
        first_reps = dom_sets[0]["reps"]
        last_reps = dom_sets[-1]["reps"]
        target = max(first_reps, 1)
        fatigue = MathUtils.fatigue_index(first_reps, last_reps, target)

    # INOL for dominant exercise
    inol_val = 0.0
    if dom_sets and max_1rm > 0:
        dom_total_reps = sum(s["reps"] for s in dom_sets)
        dom_weight = max(s["weight_kg"] for s in dom_sets)
        try:
            inol_val = MathUtils.inol(dom_weight, max_1rm, dom_total_reps)
        except Exception:
            inol_val = 0.0

    return {
        "total_volume": round(total_volume, 2),
        "total_sets": total_sets,
        "total_reps": total_reps,
        "avg_intensity": round(avg_intensity, 4),
        "max_1rm": round(max_1rm, 2),
        "dominant_exercise": dominant,
        "fatigue_index": round(fatigue, 4),
        "inol": round(min(inol_val, 99.0), 4),
    }


# ─────────────────────────────────────────────────────────────
# Main ingestion function
# ─────────────────────────────────────────────────────────────

def ingest_csv(
    filepath: str,
    conn,
    user_id: int,
) -> Dict[str, Any]:
    """
    Full ingestion pipeline.

    Parameters
    ----------
    filepath : path to strong_raw.csv
    conn     : live psycopg2.extensions.connection (PostgreSQL)
    user_id  : ID of the user to associate data with

    Returns
    -------
    dict with ingestion summary stats
    """
    from repositories.workout_repo import WorkoutRepository
    from repositories.metric_repo import MetricRepository

    workout_repo = WorkoutRepository(conn)
    metric_repo = MetricRepository(conn)

    raw_rows = parse_csv(filepath)
    if not raw_rows:
        return {"error": "Empty CSV", "rows_parsed": 0}

    # ── Group rows by workout number ──────────────────────────
    workouts_map: Dict[str, List[Dict]] = {}
    for row in raw_rows:
        wnum = _clean(row.get("Workout #", "0"))
        if wnum not in workouts_map:
            workouts_map[wnum] = []
        workouts_map[wnum].append(row)

    stats = {
        "rows_parsed": len(raw_rows),
        "workouts_created": 0,
        "sets_inserted": 0,
        "exercises_registered": 0,
        "prs_updated": 0,
    }

    exercise_cache: Dict[str, int] = {}  # name -> exercise_id

    for wnum_str, rows in sorted(workouts_map.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
        # Read session-level info from first row
        first = rows[0]
        session_date = _clean(first.get("Date", ""))
        workout_name = _clean(first.get("Workout Name", "Unknown"))
        duration_sec = _safe_int(first.get("Duration (sec)", "0"))
        workout_notes = _clean(first.get("Workout Notes", ""))

        # Create workout record
        workout_data = {
            "user_id": user_id,
            "workout_number": int(wnum_str) if wnum_str.isdigit() else 0,
            "workout_name": workout_name,
            "session_date": session_date,
            "duration_sec": duration_sec,
            "notes": workout_notes,
        }
        workout = workout_repo.create(workout_data)
        workout_id = workout["id"]
        stats["workouts_created"] += 1

        # ── Process sets ──────────────────────────────────────
        set_records: List[Dict[str, Any]] = []

        for row in rows:
            exercise_name = _clean(row.get("Exercise Name", ""))
            set_order = _clean(row.get("Set Order", ""))
            weight_kg = _safe_float(row.get("Weight (kg)", "0"))
            reps = _safe_int(row.get("Reps", "0"))
            rpe_raw = _clean(row.get("RPE", ""))
            rpe = _safe_float(rpe_raw) if rpe_raw else None
            distance_m = _safe_float(row.get("Distance (meters)", ""))
            seconds = _safe_float(row.get("Seconds", ""))

            if not exercise_name:
                continue

            # Get/create exercise
            if exercise_name not in exercise_cache:
                muscle = infer_muscle_group(exercise_name)
                ex_id = workout_repo.get_or_create_exercise(exercise_name, muscle)
                exercise_cache[exercise_name] = ex_id
                stats["exercises_registered"] += 1
            ex_id = exercise_cache[exercise_name]

            # Compute derived metrics
            one_rm = 0.0
            volume = 0.0
            if weight_kg > 0 and reps > 0:
                one_rm = MathUtils.epley_1rm(weight_kg, reps)
                volume = weight_kg * reps

            s = {
                "workout_id": workout_id,
                "exercise_id": ex_id,
                "exercise_name": exercise_name,
                "set_order": set_order,
                "weight_kg": weight_kg,
                "reps": reps,
                "rpe": rpe,
                "distance_m": distance_m if distance_m > 0 else None,
                "duration_s": seconds if seconds > 0 else None,
                "one_rm_est": round(one_rm, 2),
                "volume_load": round(volume, 2),
            }
            workout_repo.insert_set(s)
            set_records.append(s)
            stats["sets_inserted"] += 1

        # ── Session metrics ───────────────────────────────────
        agg = aggregate_session(set_records)
        metric_data = {
            "user_id": user_id,
            "workout_id": workout_id,
            "session_date": session_date,
            **agg,
        }
        metric_repo.create(metric_data)

        # ── Personal records ──────────────────────────────────
        best_by_ex: Dict[int, Dict] = {}
        for s in set_records:
            if s["set_order"] in ("W", "Rest Timer", ""):
                continue
            ex_id = s["exercise_id"]
            if ex_id not in best_by_ex or s["one_rm_est"] > best_by_ex[ex_id]["one_rm_est"]:
                best_by_ex[ex_id] = s

        for ex_id, s in best_by_ex.items():
            workout_repo.upsert_personal_record({
                "user_id": user_id,
                "exercise_id": ex_id,
                "achieved_date": session_date,
                "weight_kg": s["weight_kg"],
                "reps": s["reps"],
                "one_rm_est": s["one_rm_est"],
                "workout_id": workout_id,
            })
            stats["prs_updated"] += 1

    conn.commit()
    return stats
