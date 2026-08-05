"""
HPI — User Pydantic Models
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from pydantic import ConfigDict


class UserBase(BaseModel):
    name: str = Field(..., min_length=0, max_length=120, description="Display name")
    email: str = Field(..., description="User email address")
    bodyweight: float = Field(default=0.0, ge=0.0, description="Bodyweight in kg")
    sex: str = Field(default="M", pattern="^[MFX]$", description="M, F, or X (for Wilks)")
    role: str = Field(default="athlete", description="User role: athlete or coach")


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=0, max_length=120)
    bodyweight: Optional[float] = Field(None, ge=0.0)
    sex: Optional[str] = Field(None, pattern="^[MFX]$")
    role: Optional[str] = Field(None, description="User role: athlete or coach")


class UserRead(UserBase):
    id: int
    age: Optional[int] = 0
    height_cm: Optional[float] = 0.0
    experience: Optional[str] = "beginner"
    goal: Optional[str] = "general"
    hypertension: Optional[str] = "No"
    diabetes: Optional[str] = "No"
    avatar_url: Optional[str] = None
    cv_url: Optional[str] = None
    onboarding_completed: Optional[bool] = False
    onboarding_data: Optional[dict] = None
    coach_verified: Optional[bool] = False
    verification_status: Optional[str] = "unsubmitted"
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, ser_json_schema=True)


class UserStats(BaseModel):
    user_id: int
    total_workouts: int
    total_volume_kg: float
    total_sets: int
    avg_session_duration_min: float
    favourite_exercise: str
    days_trained: int
    current_streak: int
