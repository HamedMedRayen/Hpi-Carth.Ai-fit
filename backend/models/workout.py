"""
HPI — Workout & Set Pydantic Models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class SetRead(BaseModel):
    id: int
    workout_id: int
    exercise_id: int
    exercise_name: Optional[str] = None
    set_order: str
    weight_kg: float
    reps: int
    rpe: Optional[float]
    distance_m: Optional[float]
    duration_s: Optional[float]
    one_rm_est: float
    volume_load: float
    set_type: str = "normal"

    model_config = ConfigDict(from_attributes=True)


class SetCreate(BaseModel):
    exercise_name: str
    set_order: str
    weight_kg: float = Field(default=0.0, ge=0.0)
    reps: int = Field(default=0, ge=0)
    rpe: Optional[float] = Field(None, ge=0.0, le=10.0)
    distance_m: Optional[float] = None
    duration_s: Optional[float] = None
    set_type: str = Field(default="normal", pattern="^(warmup|normal|superset)$")


class WorkoutBase(BaseModel):
    workout_name: str = Field(..., min_length=1)
    session_date: str
    duration_sec: int = Field(default=0, ge=0)
    notes: str = Field(default="")


class WorkoutCreate(WorkoutBase):
    user_id: int
    sets: List[SetCreate] = []


class WorkoutRead(WorkoutBase):
    id: int
    user_id: int
    workout_number: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class WorkoutDetail(WorkoutRead):
    sets: List[SetRead] = []
    total_volume: float = 0.0
    total_sets: int = 0
    top_exercise: str = ""


class WorkoutSummary(BaseModel):
    """Lightweight summary for list views."""
    id: int
    workout_number: int
    workout_name: str
    session_date: str
    duration_sec: int
    total_volume: float
    total_sets: int
    exercises_count: int


class ExerciseRead(BaseModel):
    id: int
    name: str
    muscle_group: str
    equipment: str

    model_config = ConfigDict(from_attributes=True)


class PersonalRecordRead(BaseModel):
    id: int
    exercise_name: str
    achieved_date: str
    weight_kg: float
    reps: int
    one_rm_est: float

    model_config = ConfigDict(from_attributes=True)
