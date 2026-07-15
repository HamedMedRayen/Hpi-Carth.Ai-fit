"""HPI — Measurement entry Pydantic models"""
from pydantic import BaseModel
from typing import Optional
from datetime import date


class MeasurementEntry(BaseModel):
    date:        date
    neck:        Optional[float] = None
    shoulders:   Optional[float] = None
    chest:       Optional[float] = None
    waist:       Optional[float] = None
    hips:        Optional[float] = None
    left_arm:    Optional[float] = None
    right_arm:   Optional[float] = None
    left_thigh:  Optional[float] = None
    right_thigh: Optional[float] = None
    left_calf:   Optional[float] = None
    right_calf:  Optional[float] = None
