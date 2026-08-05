"""
HPI — /api/onboarding routes
Save onboarding answers, extract profile fields, update users table and log bodyweight.
"""
import json
import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from routes.auth import get_current_user_id
from repositories.user_repo import UserRepository

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class OnboardingSaveRequest(BaseModel):
    answers: Dict[str, Any]


@router.post("/save")
def save_onboarding(
    payload: OnboardingSaveRequest,
    user_id: int = Depends(get_current_user_id),
    db: psycopg2.extensions.connection = Depends(get_db)
):
    """
    Saves full onboarding JSON to user profile, extracts key profile attributes
    (name, sex, age, height, weight, goal, experience, hypertension, diabetes),
    marks onboarding_completed = TRUE, and logs weight to bodyweight_logs.
    """
    answers = payload.answers or {}

    # Extract fields with safe defaults & parsing
    name = answers.get("name")
    
    # Date of birth -> compute age
    age = None
    dob = answers.get("date_of_birth")
    if isinstance(dob, dict) and dob.get("year"):
        try:
            b_year = int(dob["year"])
            age = max(0, datetime.now().year - b_year)
        except (ValueError, TypeError):
            pass
    elif isinstance(dob, str) and "-" in dob:
        try:
            b_year = int(dob.split("-")[0])
            age = max(0, datetime.now().year - b_year)
        except (ValueError, TypeError):
            pass

    # Biological sex
    raw_sex = answers.get("biological_sex")
    sex = None
    if raw_sex:
        if str(raw_sex).lower().startswith("male"):
            sex = "M"
        elif str(raw_sex).lower().startswith("female"):
            sex = "F"
        else:
            sex = "Other"

    # Height
    raw_height = answers.get("height")
    height_cm = None
    if raw_height is not None:
        try:
            if isinstance(raw_height, dict):
                val = float(raw_height.get("value", 0))
                unit = raw_height.get("unit", "cm")
                height_cm = val * 30.48 if unit == "ft" else val
            else:
                height_cm = float(raw_height)
        except (ValueError, TypeError):
            pass

    # Current Weight
    raw_weight = answers.get("current_weight")
    bodyweight = None
    if raw_weight is not None:
        try:
            if isinstance(raw_weight, dict):
                val = float(raw_weight.get("value", 0))
                unit = raw_weight.get("unit", "kg")
                bodyweight = val * 0.45359237 if unit == "lb" else val
            else:
                bodyweight = float(raw_weight)
        except (ValueError, TypeError):
            pass

    # Goal
    goal = answers.get("primary_goal")

    # Experience / Fitness Level
    raw_exp = answers.get("fitness_level")
    experience = None
    if raw_exp:
        exp_str = str(raw_exp).lower()
        if "beginner" in exp_str:
            experience = "beginner"
        elif "intermediate" in exp_str:
            experience = "intermediate"
        elif "advanced" in exp_str:
            experience = "advanced"
        elif "athlete" in exp_str:
            experience = "athlete"
        else:
            experience = raw_exp

    # Medical Conditions (Hypertension & Diabetes)
    raw_med = answers.get("medical_conditions", [])
    hypertension = "No"
    diabetes = "No"
    
    if isinstance(raw_med, list):
        med_str = " ".join([str(m) for m in raw_med]).lower()
    else:
        med_str = str(raw_med).lower()

    if "hypertension" in med_str:
        hypertension = "Yes"
    if "diabetes" in med_str:
        diabetes = "Yes"

    # Build dynamic UPDATE query for non-null extracted fields + JSON + completed flag
    update_fields = [
        "onboarding_completed = TRUE",
        "onboarding_data = %s",
        "updated_at = NOW()"
    ]
    query_params = [json.dumps(answers)]

    if name:
        update_fields.append("name = %s")
        query_params.append(str(name))
    if sex:
        update_fields.append("sex = %s")
        query_params.append(sex)
    if age is not None:
        update_fields.append("age = %s")
        query_params.append(age)
    if height_cm is not None:
        update_fields.append("height_cm = %s")
        query_params.append(height_cm)
    if bodyweight is not None:
        update_fields.append("bodyweight = %s")
        query_params.append(bodyweight)
    if goal:
        update_fields.append("goal = %s")
        query_params.append(str(goal))
    if experience:
        update_fields.append("experience = %s")
        query_params.append(str(experience))
    if hypertension:
        update_fields.append("hypertension = %s")
        query_params.append(hypertension)
    if diabetes:
        update_fields.append("diabetes = %s")
        query_params.append(diabetes)

    query_params.append(user_id)
    sql = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"

    with db.cursor() as cur:
        cur.execute(sql, query_params)

        # Log weight to bodyweight_logs if provided
        if bodyweight is not None and bodyweight > 0:
            today_date = datetime.now().date()
            cur.execute("""
                INSERT INTO bodyweight_logs (user_id, logged_at, weight_kg)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, logged_at) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
            """, (user_id, today_date, bodyweight))

    db.commit()

    repo = UserRepository(db)
    user_data = repo.get_by_id(user_id)
    return {
        "status": "success",
        "message": "Onboarding completed successfully",
        "user": user_data
    }
