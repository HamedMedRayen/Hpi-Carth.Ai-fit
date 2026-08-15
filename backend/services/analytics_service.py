"""
HPI — Analytics Service
==============================
Orchestrates PCA and GBDT computation via the custom engine.
Bridges the repository layer with the math engine.
"""

import sys
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))
from data_engine.engine import (
    DataMatrix, StatEngine, MathUtils, LinearAlgebra, VectorOps
)


# ─────────────────────────────────────────────────────────────
# Volume Progression Analytics
# ─────────────────────────────────────────────────────────────

def compute_volume_progression(
    timeseries: List[Dict[str, Any]],
    window: int = 4,
) -> Dict[str, Any]:
    """
    Compute volume progression stats from timeseries rows.
    """
    if not timeseries:
        return {
            "dates": [], "volumes": [], "moving_avg": [],
            "trend_slope": 0.0, "trend_intercept": 0.0
        }

    dates = [row["date"] for row in timeseries]
    volumes = [float(row.get("volume", 0) or 0) for row in timeseries]

    moving_avg = StatEngine.moving_average(volumes, window)

    x_idx = list(range(len(volumes)))
    if len(volumes) >= 2:
        slope, intercept, _ = StatEngine.linear_regression(x_idx, volumes)
    else:
        slope, intercept = 0.0, volumes[0] if volumes else 0.0

    return {
        "dates": dates,
        "volumes": [round(v, 2) for v in volumes],
        "moving_avg": [round(v, 2) for v in moving_avg],
        "trend_slope": round(slope, 4),
        "trend_intercept": round(intercept, 2),
    }


# ─────────────────────────────────────────────────────────────
# Dashboard summary helpers
# ─────────────────────────────────────────────────────────────

def compute_dashboard_summary(
    metric_rows: List[Dict[str, Any]],
    pr_rows: List[Dict[str, Any]],
    timeseries: List[Dict[str, Any]],
    active_injuries_count: int = 0,
) -> Dict[str, Any]:
    """Build the full dashboard summary dict."""

    total_workouts = len(metric_rows)
    total_volume_kg = sum(float(r.get("total_volume", 0) or 0) for r in metric_rows)
    total_volume_tonnes = round(total_volume_kg / 1000.0, 3)

    # Best 1RM per exercise from PRs
    best_1rm: Dict[str, float] = {}
    for pr in pr_rows:
        name = pr.get("exercise_name", "")
        val = float(pr.get("one_rm_est", 0) or 0)
        if name not in best_1rm or val > best_1rm[name]:
            best_1rm[name] = round(val, 1)

    # Weekly volume (last 12 weeks)
    weekly: Dict[str, float] = {}
    for row in timeseries:
        date_str = str(row.get("date", ""))
        if len(date_str) >= 10:
            try:
                from datetime import date, timedelta
                d = date.fromisoformat(date_str[:10])
                # ISO week start (Monday)
                week_start = d - timedelta(days=d.weekday())
                key = str(week_start)
                weekly[key] = weekly.get(key, 0.0) + float(row.get("volume", 0) or 0)
            except (ValueError, TypeError):
                pass

    weekly_sorted = sorted(weekly.items())[-12:]
    weekly_volume = [{"week": k, "volume": round(v, 2)} for k, v in weekly_sorted]

    # Recent PRs (last 5)
    recent_prs = sorted(
        pr_rows,
        key=lambda r: r.get("achieved_date", ""),
        reverse=True
    )[:5]
    recent_pr_out = [
        {
            "exercise": r.get("exercise_name", ""),
            "weight_kg": float(r.get("weight_kg", 0) or 0),
            "reps": int(r.get("reps", 0) or 0),
            "one_rm": round(float(r.get("one_rm_est", 0) or 0), 1),
            "date": r.get("achieved_date", ""),
        }
        for r in recent_prs
    ]

    # Muscle group split (from dominant exercise heuristic)
    from services.ingestion_service import infer_muscle_group
    muscle_counts: Dict[str, int] = {}
    for row in metric_rows:
        dom = row.get("dominant_exercise", "") or ""
        mg = infer_muscle_group(dom)
        muscle_counts[mg] = muscle_counts.get(mg, 0) + 1

    total_sessions = max(sum(muscle_counts.values()), 1)
    muscle_split = {k: round(v / total_sessions * 100, 1) for k, v in muscle_counts.items()}

    # Volume trend (last 4 vs previous 4 weeks)
    vols = [v for _, v in weekly_sorted]
    trend = "stable"
    change_pct = 0.0
    if len(vols) >= 8:
        recent_avg = sum(vols[-4:]) / 4
        prev_avg = sum(vols[-8:-4]) / 4
        if prev_avg > 0:
            change_pct = round((recent_avg - prev_avg) / prev_avg * 100, 1)
        trend = "up" if change_pct > 5 else ("down" if change_pct < -5 else "stable")

    # Accurate Data-Driven AI Insight Generation
    ai_insight = generate_accurate_daily_insight(
        total_workouts=total_workouts,
        total_volume_tonnes=total_volume_tonnes,
        recent_prs=recent_pr_out,
        muscle_split=muscle_split,
        trend=trend,
        change_pct=change_pct,
        active_injuries_count=active_injuries_count
    )

    return {
        "total_workouts": total_workouts,
        "total_volume_tonnes": total_volume_tonnes,
        "best_1rm": best_1rm,
        "weekly_volume": weekly_volume,
        "recent_prs": recent_pr_out,
        "muscle_group_split": muscle_split,
        "volume_trend": trend,
        "volume_change_pct": change_pct,
        "active_injuries_count": active_injuries_count,
        "ai_insight": ai_insight
    }


def generate_accurate_daily_insight(
    total_workouts: int,
    total_volume_tonnes: float,
    recent_prs: List[Dict[str, Any]],
    muscle_split: Dict[str, float],
    trend: str,
    change_pct: float,
    active_injuries_count: int,
) -> str:
    """Generate deterministic, data-driven daily insight based on athlete's real metrics."""
    from datetime import date, datetime, timedelta

    # 1. Critical priority: Active Injuries
    if active_injuries_count > 0:
        if active_injuries_count == 1:
            return "Caution: You have 1 active injury area logged. Ensure thorough dynamic warm-ups and avoid pain-aggravating ranges of motion today."
        return f"Caution: You have {active_injuries_count} active injury areas flagged. Prioritize active recovery, mobility, and lower intensity today."

    # 2. High priority: Recent PR achieved in the last 7 days
    today = date.today()
    for pr in recent_prs:
        pr_date_str = str(pr.get("date", ""))[:10]
        if pr_date_str:
            try:
                pr_date = date.fromisoformat(pr_date_str)
                if (today - pr_date).days <= 7:
                    ex_name = pr.get("exercise", "your lift")
                    one_rm = pr.get("one_rm", 0)
                    weight = pr.get("weight_kg", 0)
                    reps = pr.get("reps", 0)
                    if one_rm > 0:
                        return f"Outstanding milestone: You hit a new personal best on {ex_name} ({weight}kg x {reps} reps, est. 1RM {one_rm}kg) this week!"
            except (ValueError, TypeError):
                pass

    # 3. Volume Progression (Up or Down trend)
    if trend == "up" and change_pct >= 5.0:
        return f"Training volume is up +{change_pct}% over the last 4 weeks. Progressive overload is progressing steadily."
    elif trend == "down" and change_pct <= -5.0:
        return f"Training volume is down {abs(change_pct)}% over the last 4 weeks. If in a deload phase, maintain movement quality; otherwise consider increasing weekly sets."

    # 4. Muscle Group Focus / Imbalance
    if muscle_split:
        valid_muscles = [(k, v) for k, v in muscle_split.items() if k.lower() not in ("other", "unknown", "")]
        if valid_muscles:
            sorted_muscles = sorted(valid_muscles, key=lambda x: x[1], reverse=True)
            top_muscle, top_pct = sorted_muscles[0]
            if top_pct >= 40.0 and len(valid_muscles) > 1:
                return f"Your training heavily emphasizes {top_muscle} ({top_pct}% of sessions). Ensure adequate antagonist volume for structural balance."

    # 5. Lifetime consistency & tonnage milestones
    if total_workouts >= 25:
        return f"Strong dedication: You have completed {total_workouts} total sessions with {total_volume_tonnes} tonnes lifted lifetime."
    elif total_workouts >= 5:
        return f"Solid training baseline: {total_workouts} workouts logged so far. Focus on progressive overload and structured recovery."
    elif total_workouts > 0:
        return f"Great start to your training journey with {total_workouts} workout{'s' if total_workouts > 1 else ''} logged. Keep building consistent habits!"

    # 6. Brand new athlete fallback
    return "Welcome to HPI! Log your first workout to begin tracking volume metrics and receiving data-driven AI coaching."
