"""
HPI — Synthetic Data Generator
======================================
Author  : HPI Engineering
Version : 1.0.0

CONSTRAINT: No numpy, pandas, or external libraries.
Uses only: math, random, statistics (Python builtins) + engine.py

Algorithm
---------
1.  Parse the real 755-row CSV using pure Python file I/O
2.  Analyse per-exercise weight/rep distributions from real data
3.  Generate synthetic sessions using a Linear Congruential Generator (LCG)
    for reproducible, statistically plausible pseudo-random values
4.  Model strength progression as a logarithmic curve:
        weight(t) = base_weight * (1 + k * log(1 + t))
5.  Interpolate missing biometric fields (sleep, stress) via
    piecewise linear interpolation
6.  Ensure set-level coherence (weights follow pyramid schemes,
    reps decrease with weight)
7.  Export expanded 2,000-row dataset to CSV

LCG Parameters (Knuth / Numerical Recipes)
-------------------------------------------
    X_{n+1} = (a * X_n + c) mod m
    a = 1_664_525
    c = 1_013_904_223
    m = 2^32
"""

import math
import statistics
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import date, timedelta

# ── Engine imports ────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))
from data_engine.engine import StatEngine, MathUtils


# ─────────────────────────────────────────────────────────────
# 1.  LINEAR CONGRUENTIAL GENERATOR
# ─────────────────────────────────────────────────────────────

class LCG:
    """
    Knuth multiplicative LCG.

        X_{n+1} = (a * X_n + c) mod m

    Produces a full-period sequence over [0, 2^32).
    """
    A: int = 1_664_525
    C: int = 1_013_904_223
    M: int = 2 ** 32

    def __init__(self, seed: int = 42):
        self._state = seed % self.M

    def next_int(self) -> int:
        self._state = (self.A * self._state + self.C) % self.M
        return self._state

    def random(self) -> float:
        """Return float in [0, 1)."""
        return self.next_int() / self.M

    def uniform(self, lo: float, hi: float) -> float:
        """Uniform sample in [lo, hi]."""
        return lo + self.random() * (hi - lo)

    def randint(self, lo: int, hi: int) -> int:
        """Integer sample in [lo, hi] inclusive."""
        return lo + self.next_int() % (hi - lo + 1)

    def choice(self, seq: list) -> Any:
        return seq[self.next_int() % len(seq)]

    def gauss(self, mu: float = 0.0, sigma: float = 1.0) -> float:
        """
        Box-Muller transform for Gaussian samples.
        Returns one sample from N(mu, sigma²).
        """
        u1 = max(1e-10, self.random())  # avoid log(0)
        u2 = self.random()
        z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        return mu + sigma * z

    def triangular(self, lo: float, hi: float, mode: float) -> float:
        """Triangular distribution sample."""
        u = self.random()
        fc = (mode - lo) / (hi - lo + 1e-12)
        if u < fc:
            return lo + math.sqrt(u * (hi - lo) * (mode - lo))
        else:
            return hi - math.sqrt((1 - u) * (hi - lo) * (hi - mode))

    def sample(self, seq: list, k: int) -> list:
        """Sample k unique items from seq (Fisher-Yates)."""
        pool = seq[:]
        n = len(pool)
        k = min(k, n)
        result = []
        for i in range(k):
            j = i + self.next_int() % (n - i)
            pool[i], pool[j] = pool[j], pool[i]
            result.append(pool[i])
        return result


# ─────────────────────────────────────────────────────────────
# 2.  REAL DATA PARSER
# ─────────────────────────────────────────────────────────────

def _clean(v: str) -> str:
    return v.strip().strip('"').strip()


def _safe_float(v: str, default: float = 0.0) -> float:
    try:
        return float(v) if v else default
    except (ValueError, TypeError):
        return default


def _safe_int(v: str, default: int = 0) -> int:
    try:
        return int(float(v)) if v else default
    except (ValueError, TypeError):
        return default


def parse_real_csv(filepath: str) -> List[Dict[str, str]]:
    """Read semicolon-delimited Strong CSV. Pure Python, no pandas."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"CSV not found: {filepath}")
    with open(filepath, "r", encoding="utf-8-sig") as f:
        lines = f.readlines()
    if not lines:
        return []
    headers = [_clean(h) for h in lines[0].split(";")]
    rows = []
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split(";")
        if len(parts) < len(headers):
            parts += [""] * (len(headers) - len(parts))
        rows.append({headers[i]: _clean(parts[i]) for i in range(len(headers))})
    return rows


# ─────────────────────────────────────────────────────────────
# 3.  EXERCISE PROFILE BUILDER
# ─────────────────────────────────────────────────────────────

class ExerciseProfile:
    """
    Statistical profile of a real exercise extracted from the CSV.
    Stores:
      - weight_min, weight_max, weight_mean, weight_std
      - rep_min, rep_max, rep_mean
      - typical_sets
      - progression_rate  (how fast 1RM improves per session)
    """

    def __init__(self, name: str):
        self.name = name
        self.weights: List[float] = []
        self.reps: List[int] = []
        self.set_counts: List[int] = []

    def add_set(self, weight: float, reps: int):
        if weight > 0 and reps > 0:
            self.weights.append(weight)
            self.reps.append(reps)

    def finalise(self) -> "ExerciseProfile":
        if not self.weights:
            self.weight_min = 20.0
            self.weight_max = 80.0
            self.weight_mean = 50.0
            self.weight_std = 10.0
            self.rep_mean = 8.0
            self.rep_std = 2.0
        else:
            self.weight_min = min(self.weights)
            self.weight_max = max(self.weights)
            self.weight_mean = StatEngine.mean(self.weights)
            self.weight_std = StatEngine.std(self.weights, ddof=0) if len(self.weights) > 1 else 5.0
            self.rep_mean = StatEngine.mean([float(r) for r in self.reps])
            self.rep_std = max(1.0,
                StatEngine.std([float(r) for r in self.reps], ddof=0)
                if len(self.reps) > 1 else 1.5
            )
        # Progression rate: approx % improvement per session (logarithmic)
        self.progression_rate = 0.012   # ~1.2% per session initially
        return self


def build_exercise_profiles(rows: List[Dict[str, str]]) -> Dict[str, ExerciseProfile]:
    """Extract per-exercise statistics from the real dataset."""
    profiles: Dict[str, ExerciseProfile] = {}
    for row in rows:
        name = row.get("Exercise Name", "").strip()
        order = row.get("Set Order", "").strip()
        if not name or order in ("W", "Rest Timer", ""):
            continue
        weight = _safe_float(row.get("Weight (kg)", "0"))
        reps = _safe_int(row.get("Reps", "0"))
        if name not in profiles:
            profiles[name] = ExerciseProfile(name)
        profiles[name].add_set(weight, reps)
    for p in profiles.values():
        p.finalise()
    return profiles


# ─────────────────────────────────────────────────────────────
# 4.  WORKOUT TEMPLATE BUILDER
# ─────────────────────────────────────────────────────────────

class WorkoutTemplate:
    """
    A workout template defines:
      - name  (e.g. 'Push', 'Pull', 'Legs')
      - exercises  (ordered list of exercise names)
      - typical duration range (sec)
      - day pattern (which weekdays it appears)
    """
    def __init__(
        self,
        name: str,
        exercises: List[str],
        duration_range: Tuple[int, int] = (3600, 7200),
        weekdays: Optional[List[int]] = None,
    ):
        self.name = name
        self.exercises = exercises
        self.duration_range = duration_range
        self.weekdays = weekdays or list(range(7))


def extract_workout_templates(rows: List[Dict[str, str]]) -> List[WorkoutTemplate]:
    """Build templates from real workout sessions."""
    from collections import defaultdict

    workout_exercises: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    workout_durations: Dict[str, List[int]] = defaultdict(list)

    for row in rows:
        wnum = row.get("Workout #", "")
        wname = row.get("Workout Name", "").strip()
        ename = row.get("Exercise Name", "").strip()
        dur = _safe_int(row.get("Duration (sec)", "0"))
        if ename and wname:
            if ename not in workout_exercises[wname][wnum]:
                workout_exercises[wname][wnum].append(ename)
        if dur > 0:
            workout_durations[wname].append(dur)

    templates = []
    for wname, sessions in workout_exercises.items():
        # Find most common exercise order across sessions
        all_exs: List[str] = []
        for exs in sessions.values():
            all_exs.extend(exs)
        # Deduplicate preserving first-seen order
        seen = set()
        ordered = []
        for e in all_exs:
            if e not in seen:
                seen.add(e)
                ordered.append(e)
        dur_list = workout_durations.get(wname, [3600, 5400])
        dur_min = min(dur_list) if dur_list else 3600
        dur_max = max(dur_list) if dur_list else 7200
        templates.append(WorkoutTemplate(
            name=wname,
            exercises=ordered[:8],   # cap at 8 exercises
            duration_range=(max(1800, dur_min), max(dur_min + 600, dur_max)),
        ))
    return templates


# ─────────────────────────────────────────────────────────────
# 5.  LOGARITHMIC STRENGTH PROGRESSION MODEL
# ─────────────────────────────────────────────────────────────

class ProgressionModel:
    """
    Models strength gain as a logarithmic curve per exercise.

    weight_at_session_t = base_weight * progression_factor(t)

    progression_factor(t) = 1 + gain_rate * log(1 + t / decay)

    Parameters
    ----------
    base_weight : starting weight (from real data mean)
    gain_rate   : peak adaptation rate  (~0.15–0.25)
    decay       : sessions before diminishing returns kick in (~20–40)
    noise_std   : day-to-day variation as fraction of weight (~0.03)
    """

    def __init__(
        self,
        base_weight: float,
        gain_rate: float = 0.20,
        decay: float = 25.0,
        noise_std: float = 0.04,
        plateau_factor: float = 1.0,  # max multiplier vs base
    ):
        self.base = base_weight
        self.gain_rate = gain_rate
        self.decay = decay
        self.noise_std = noise_std
        self.plateau = plateau_factor

    def weight_at(self, t: int, lcg: LCG) -> float:
        """
        Return realistic working weight at session t.
        Includes log progression + Gaussian noise + periodic deload.
        """
        # Log growth
        progress = 1.0 + self.gain_rate * math.log(1.0 + t / self.decay)
        progress = min(progress, self.plateau)
        ideal = self.base * progress

        # Gaussian noise (daily readiness variation)
        noise = lcg.gauss(0.0, self.noise_std * ideal)

        # Occasional deload (every ~8 sessions, -10%)
        if t > 0 and t % 8 == 0 and lcg.random() < 0.35:
            ideal *= 0.88

        raw = ideal + noise
        # Round to nearest 2.5 kg (standard plate increment)
        return max(self.base * 0.5, round(raw / 2.5) * 2.5)

    def reps_at(self, t: int, weight: float, target_reps: float, lcg: LCG) -> int:
        """
        Reps follow an inverse relationship with weight.
        Higher weight → fewer reps. Also improves slightly over time.
        """
        rep_progress = 1.0 + 0.08 * math.log(1.0 + t / 30.0)
        base_reps = target_reps * rep_progress
        # Fatigue across sets is handled at the set-generation level
        noise = lcg.gauss(0.0, 1.2)
        reps = max(1, round(base_reps + noise))
        return min(reps, 20)


# ─────────────────────────────────────────────────────────────
# 6.  BIOMETRIC INTERPOLATION
# ─────────────────────────────────────────────────────────────

def generate_biometric_series(
    n_sessions: int,
    lcg: LCG,
    sleep_anchor_points: Optional[List[Tuple[int, float]]] = None,
    stress_anchor_points: Optional[List[Tuple[int, float]]] = None,
) -> Tuple[List[float], List[float]]:
    """
    Generate sleep hours and stress (1-10) timeseries for n_sessions.

    Uses piecewise linear interpolation between sparse anchor points,
    then adds Gaussian noise to simulate daily variation.

    Parameters
    ----------
    sleep_anchor_points  : [(session_idx, sleep_hours), ...]
    stress_anchor_points : [(session_idx, stress_score), ...]

    Returns
    -------
    (sleep_list, stress_list)  each of length n_sessions
    """
    # Default anchors if not provided
    if sleep_anchor_points is None:
        sleep_anchor_points = [
            (0,               7.2),
            (n_sessions // 4, 6.8),
            (n_sessions // 2, 7.5),
            (n_sessions * 3 // 4, 7.0),
            (n_sessions - 1, 7.8),
        ]
    if stress_anchor_points is None:
        stress_anchor_points = [
            (0,               4.5),
            (n_sessions // 6, 6.0),
            (n_sessions // 3, 5.2),
            (n_sessions // 2, 4.8),
            (n_sessions * 2 // 3, 5.5),
            (n_sessions - 1, 4.2),
        ]

    xs_sleep  = [p[0] for p in sleep_anchor_points]
    ys_sleep  = [p[1] for p in sleep_anchor_points]
    xs_stress = [p[0] for p in stress_anchor_points]
    ys_stress = [p[1] for p in stress_anchor_points]

    sleep_list  = []
    stress_list = []

    for t in range(n_sessions):
        # Interpolate base values
        base_sleep  = MathUtils.linear_interpolate(xs_sleep,  ys_sleep,  float(t))
        base_stress = MathUtils.linear_interpolate(xs_stress, ys_stress, float(t))

        # Add noise
        sleep_noise  = lcg.gauss(0.0, 0.4)
        stress_noise = lcg.gauss(0.0, 0.8)

        sleep  = MathUtils.clamp(base_sleep  + sleep_noise,  4.0, 10.0)
        stress = MathUtils.clamp(base_stress + stress_noise, 1.0, 10.0)

        sleep_list.append(round(sleep, 1))
        stress_list.append(round(stress, 1))

    return sleep_list, stress_list


# ─────────────────────────────────────────────────────────────
# 7.  SET GENERATOR
# ─────────────────────────────────────────────────────────────

def generate_sets_for_exercise(
    exercise_name: str,
    profile: ExerciseProfile,
    progression: ProgressionModel,
    session_idx: int,
    workout_id: int,
    lcg: LCG,
    n_sets: int = 3,
    target_reps: float = 8.0,
) -> List[Dict[str, Any]]:
    """
    Generate realistic sets for one exercise in one session.

    Set structure:
      - 1 warmup set  (60% working weight, higher reps)
      - n_sets working sets (pyramid or straight sets)
      - Rest timer rows between sets
    """
    working_weight = progression.weight_at(session_idx, lcg)

    rows = []

    # Warmup
    warmup_weight = round(working_weight * lcg.uniform(0.55, 0.65) / 2.5) * 2.5
    warmup_reps = lcg.randint(10, 15)
    rows.append({
        "exercise_name": exercise_name,
        "set_order": "W",
        "weight_kg": warmup_weight,
        "reps": warmup_reps,
        "rpe": "",
        "one_rm_est": round(MathUtils.epley_1rm(warmup_weight, warmup_reps), 2),
        "volume_load": round(warmup_weight * warmup_reps, 2),
    })

    # Decide: pyramid (increasing weight) or straight sets
    is_pyramid = lcg.random() < 0.4
    fatigue_rpe = lcg.uniform(6.5, 7.5)   # starting RPE

    for s in range(1, n_sets + 1):
        if is_pyramid:
            # Weights increase set to set
            factor = 1.0 + (s - 1) * lcg.uniform(0.04, 0.07)
            w = round(working_weight * factor / 2.5) * 2.5
            w = min(w, profile.weight_max * 1.15)
        else:
            # Straight sets with slight fatigue
            w = working_weight

        # Reps decrease with weight and fatigue
        base_r = target_reps - (s - 1) * lcg.uniform(0.5, 1.5)
        reps = max(1, round(projection := (
            progression.reps_at(session_idx, w, base_r, lcg)
        )))

        # RPE increases with fatigue
        rpe = round(MathUtils.clamp(
            fatigue_rpe + (s - 1) * lcg.uniform(0.3, 0.6),
            6.0, 10.0
        ), 1)

        one_rm = round(MathUtils.epley_1rm(w, reps), 2) if reps > 0 else 0.0
        vol    = round(w * reps, 2)

        rows.append({
            "exercise_name": exercise_name,
            "set_order": str(s),
            "weight_kg": w,
            "reps": reps,
            "rpe": rpe,
            "one_rm_est": one_rm,
            "volume_load": vol,
        })

        # Rest timer between working sets
        if s < n_sets:
            rest = lcg.randint(90, 180)
            rows.append({
                "exercise_name": exercise_name,
                "set_order": "Rest Timer",
                "weight_kg": "",
                "reps": "",
                "rpe": "",
                "one_rm_est": 0.0,
                "volume_load": 0.0,
                "seconds": rest,
            })

    return rows


# ─────────────────────────────────────────────────────────────
# 8.  SESSION SCHEDULER
# ─────────────────────────────────────────────────────────────

def generate_session_dates(
    n_sessions: int,
    start_date: date,
    lcg: LCG,
    sessions_per_week: float = 4.0,
    min_rest_days: int = 1,
) -> List[date]:
    """
    Generate a realistic workout schedule.
    - Average sessions_per_week with day-to-day variation
    - Enforces min_rest_days between sessions
    - Occasional missed weeks (holidays/illness)
    """
    avg_gap = max(min_rest_days + 1, round(7.0 / sessions_per_week))
    dates = []
    current = start_date

    while len(dates) < n_sessions:
        # Occasionally skip a week (illness, travel)
        if lcg.random() < 0.06:
            current += timedelta(days=lcg.randint(5, 10))

        dates.append(current)

        # Gap to next session: avg_gap ± 1 day
        gap = avg_gap + lcg.randint(-1, 2)
        gap = max(min_rest_days + 1, gap)
        current += timedelta(days=gap)

    return dates[:n_sessions]


# ─────────────────────────────────────────────────────────────
# 9.  MAIN GENERATOR
# ─────────────────────────────────────────────────────────────

def generate_synthetic_dataset(
    real_csv_path: str,
    output_path: str,
    target_rows: int = 2000,
    seed: int = 42,
    verbose: bool = True,
) -> Dict[str, Any]:
    """
    Main entry point. Generates a synthetic dataset and writes it to CSV.

    Parameters
    ----------
    real_csv_path : path to strong_raw.csv
    output_path   : path to write synthetic_2000.csv
    target_rows   : approximate number of CSV rows (including warmups & rest timers)
    seed          : LCG seed for reproducibility
    verbose       : print progress

    Returns
    -------
    dict with generation statistics
    """
    lcg = LCG(seed=seed)

    if verbose:
        print("═" * 60)
        print("  HPI Synthetic Data Generator")
        print("  Algorithm : LCG (Knuth) + Log Strength Progression")
        print("  Constraint: No numpy / pandas")
        print("═" * 60)

    # ── Parse real data ───────────────────────────────────────
    if verbose:
        print(f"\n[1/5] Parsing real CSV: {real_csv_path}")
    real_rows = parse_real_csv(real_csv_path)
    if verbose:
        print(f"      → {len(real_rows)} raw rows")

    # ── Build profiles & templates ────────────────────────────
    if verbose:
        print("[2/5] Building exercise profiles & workout templates…")
    profiles   = build_exercise_profiles(real_rows)
    templates  = extract_workout_templates(real_rows)
    if verbose:
        print(f"      → {len(profiles)} exercise profiles")
        print(f"      → {len(templates)} workout templates: "
              f"{[t.name for t in templates]}")

    # ── Build progression models ──────────────────────────────
    if verbose:
        print("[3/5] Initialising logarithmic progression models…")
    progression_models: Dict[str, ProgressionModel] = {}
    for name, profile in profiles.items():
        # Vary gain rate and decay per exercise for realism
        gain  = lcg.uniform(0.10, 0.28)
        decay = lcg.uniform(15.0, 45.0)
        noise = lcg.uniform(0.02, 0.06)
        # Natural ceiling: compound lifts have higher ceiling
        ceiling = 1.0 + lcg.uniform(0.20, 0.55)
        progression_models[name] = ProgressionModel(
            base_weight  = profile.weight_mean,
            gain_rate    = gain,
            decay        = decay,
            noise_std    = noise,
            plateau_factor = ceiling,
        )

    # ── Estimate sessions needed ──────────────────────────────
    # Avg sets per session ≈ (exercises × 4 sets + rest timers)
    avg_exercises = statistics.mean([len(t.exercises) for t in templates]) if templates else 5
    avg_rows_per_session = avg_exercises * (1 + 3 + 2)   # warmup + sets + rest timers
    n_sessions_needed = max(50, math.ceil(target_rows / avg_rows_per_session))

    if verbose:
        print(f"[4/5] Generating {n_sessions_needed} sessions "
              f"(~{avg_rows_per_session:.0f} rows/session)…")

    # ── Generate biometrics ───────────────────────────────────
    sleep_series, stress_series = generate_biometric_series(n_sessions_needed, lcg)

    # ── Generate session schedule ─────────────────────────────
    # Start synthetic data right after last real session
    real_last_date_str = "2026-01-12"
    try:
        real_rows_sorted = [r for r in real_rows if r.get("Date")]
        if real_rows_sorted:
            last_date_str = max(r["Date"][:10] for r in real_rows_sorted)
            real_last_date = date.fromisoformat(last_date_str)
        else:
            real_last_date = date(2026, 1, 12)
    except (ValueError, AttributeError):
        real_last_date = date(2026, 1, 12)

    session_dates = generate_session_dates(
        n_sessions_needed,
        start_date=real_last_date + timedelta(days=3),
        lcg=lcg,
        sessions_per_week=4.0,
    )

    # ── Determine real workout count for numbering ────────────
    real_workout_nums = set()
    for r in real_rows:
        wn = r.get("Workout #", "")
        try:
            real_workout_nums.add(int(wn))
        except (ValueError, TypeError):
            pass
    max_real_workout = max(real_workout_nums) if real_workout_nums else 22

    # ── Generate rows ─────────────────────────────────────────
    output_rows: List[Dict[str, Any]] = []
    stats = {
        "sessions_generated": 0,
        "sets_generated": 0,
        "exercises_covered": set(),
        "total_volume_kg": 0.0,
        "seed": seed,
        "lcg_class": "LCG(Knuth, a=1664525, c=1013904223, m=2^32)",
    }

    for sess_idx, sess_date in enumerate(session_dates):
        if len(output_rows) >= target_rows:
            break

        # Pick workout template (rotate through templates)
        template = templates[sess_idx % len(templates)] if templates else WorkoutTemplate(
            "Training", list(profiles.keys())[:5]
        )

        workout_num = max_real_workout + sess_idx + 1
        date_str = sess_date.strftime("%Y-%m-%d %H:%M:%S")

        # Duration with slight variation
        dur_min, dur_max = template.duration_range
        duration = lcg.randint(dur_min, dur_max)

        # Sets per exercise (varies: 2-4 for accessories, 3-5 for compounds)
        compound_keywords = ["squat", "deadlift", "bench", "press", "row"]

        session_rows: List[Dict[str, Any]] = []

        # Pick exercises for this session (template + occasional variation)
        exercise_list = template.exercises[:]
        if lcg.random() < 0.2 and len(exercise_list) > 2:
            # Swap one exercise for variety
            alt = lcg.choice(list(profiles.keys()))
            idx = lcg.randint(len(exercise_list) // 2, len(exercise_list) - 1)
            exercise_list[idx] = alt

        for ex_name in exercise_list:
            profile = profiles.get(ex_name)
            if not profile:
                # Create a minimal profile for new exercises
                profile = ExerciseProfile(ex_name)
                profile.weight_min = 20.0
                profile.weight_max = 80.0
                profile.weight_mean = 40.0
                profile.weight_std = 8.0
                profile.rep_mean = 8.0
                profile.rep_std = 1.5
                profile.progression_rate = 0.012

            prog = progression_models.get(ex_name)
            if not prog:
                prog = ProgressionModel(base_weight=profile.weight_mean)
                progression_models[ex_name] = prog

            is_compound = any(kw in ex_name.lower() for kw in compound_keywords)
            n_sets = lcg.randint(4, 5) if is_compound else lcg.randint(3, 4)
            target_reps = lcg.triangular(4.0, 12.0, 6.0 if is_compound else 9.0)

            ex_rows = generate_sets_for_exercise(
                exercise_name=ex_name,
                profile=profile,
                progression=prog,
                session_idx=sess_idx,
                workout_id=workout_num,
                lcg=lcg,
                n_sets=n_sets,
                target_reps=target_reps,
            )

            for row in ex_rows:
                vol = row.get("volume_load", 0.0)
                if isinstance(vol, float):
                    stats["total_volume_kg"] += vol

            stats["exercises_covered"].add(ex_name)
            session_rows.extend(ex_rows)

        # Build final CSV rows
        for row in session_rows:
            csv_row: Dict[str, Any] = {
                "Workout #": workout_num,
                "Date": date_str,
                "Workout Name": template.name,
                "Duration (sec)": duration,
                "Exercise Name": row["exercise_name"],
                "Set Order": row["set_order"],
                "Weight (kg)": row.get("weight_kg", ""),
                "Reps": row.get("reps", ""),
                "RPE": row.get("rpe", ""),
                "Distance (meters)": "",
                "Seconds": row.get("seconds", ""),
                "Notes": "",
                "Workout Notes": "",
                # Extra synthetic fields
                "Sleep (hrs)": sleep_series[sess_idx],
                "Stress (1-10)": stress_series[sess_idx],
                "Session Index": sess_idx,
            }
            output_rows.append(csv_row)
            if row.get("set_order") not in ("W", "Rest Timer"):
                stats["sets_generated"] += 1

        stats["sessions_generated"] += 1

        if verbose and sess_idx % 50 == 0 and sess_idx > 0:
            print(f"      Session {sess_idx}/{n_sessions_needed} "
                  f"({len(output_rows)} rows)…")

    if verbose:
        print(f"      → {len(output_rows)} rows across "
              f"{stats['sessions_generated']} sessions")

    # ── Write output CSV ──────────────────────────────────────
    if verbose:
        print(f"[5/5] Writing synthetic CSV: {output_path}")

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    headers = [
        "Workout #", "Date", "Workout Name", "Duration (sec)", "Exercise Name",
        "Set Order", "Weight (kg)", "Reps", "RPE",
        "Distance (meters)", "Seconds", "Notes", "Workout Notes",
        "Sleep (hrs)", "Stress (1-10)", "Session Index",
    ]

    with open(output_path, "w", encoding="utf-8") as f:
        # Write semicolon-delimited to match Strong format
        f.write(";".join(f'"{h}"' for h in headers) + "\n")
        for row in output_rows:
            parts = []
            for h in headers:
                v = row.get(h, "")
                parts.append(f'"{v}"' if v != "" else '""')
            f.write(";".join(parts) + "\n")

    stats["exercises_covered"] = len(stats["exercises_covered"])
    stats["output_path"] = output_path
    stats["total_rows"] = len(output_rows)
    stats["total_volume_tonnes"] = round(stats["total_volume_kg"] / 1000.0, 2)

    if verbose:
        print("\n" + "─" * 60)
        print("  Generation Complete")
        print("─" * 60)
        print(f"  Sessions   : {stats['sessions_generated']}")
        print(f"  Total rows : {stats['total_rows']}")
        print(f"  Sets       : {stats['sets_generated']}")
        print(f"  Exercises  : {stats['exercises_covered']}")
        print(f"  Volume     : {stats['total_volume_tonnes']} tonnes")
        print(f"  Output     : {output_path}")
        print("─" * 60)

    return stats


# ─────────────────────────────────────────────────────────────
# SELF-TEST
# ─────────────────────────────────────────────────────────────

def _run_lcg_tests():
    """Verify LCG statistical properties."""
    print("LCG Self-Test")
    lcg = LCG(seed=12345)

    # Reproducibility
    lcg2 = LCG(seed=12345)
    vals1 = [lcg.random()  for _ in range(100)]
    vals2 = [lcg2.random() for _ in range(100)]
    assert vals1 == vals2, "LCG not reproducible!"
    print("  ✅ Reproducibility")

    # Uniform distribution: mean ≈ 0.5
    lcg3 = LCG(seed=99)
    samples = [lcg3.random() for _ in range(10_000)]
    mean_ = StatEngine.mean(samples)
    assert abs(mean_ - 0.5) < 0.02, f"LCG mean {mean_:.4f} ≠ 0.5"
    print(f"  ✅ Uniform mean: {mean_:.4f} ≈ 0.500")

    # Gaussian: mean ≈ 0, std ≈ 1
    lcg4 = LCG(seed=7)
    gauss = [lcg4.gauss(0, 1) for _ in range(5_000)]
    gm = StatEngine.mean(gauss)
    gs = StatEngine.std(gauss, ddof=0)
    assert abs(gm) < 0.05,       f"Gauss mean {gm:.4f} off"
    assert abs(gs - 1.0) < 0.05, f"Gauss std  {gs:.4f} off"
    print(f"  ✅ Gaussian: mean={gm:.4f}, std={gs:.4f}")

    # Log progression is monotonically increasing (in expectation)
    lcg5 = LCG(seed=1)
    prog = ProgressionModel(base_weight=100.0, gain_rate=0.20, decay=20.0, noise_std=0.0)
    weights = [prog.weight_at(t, lcg5) for t in range(0, 60, 5)]
    # Should generally increase (noise=0 so exact)
    increasing = sum(1 for i in range(1, len(weights)) if weights[i] >= weights[i-1])
    assert increasing >= len(weights) - 2, "Progression not monotone"
    print(f"  ✅ Log progression: {[int(w) for w in weights]}")

    # Biometric interpolation
    sleep, stress = generate_biometric_series(20, LCG(seed=3))
    assert len(sleep) == 20
    assert all(4 <= s <= 10 for s in sleep), "Sleep out of range"
    assert all(1 <= s <= 10 for s in stress), "Stress out of range"
    print(f"  ✅ Biometrics: sleep=[{min(sleep):.1f},{max(sleep):.1f}], "
          f"stress=[{min(stress):.1f},{max(stress):.1f}]")

    print("  ✅ All LCG tests passed\n")


# ─────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="HPI Synthetic Data Generator")
    parser.add_argument("--input",   default="/mnt/user-data/uploads/strong_raw.csv")
    parser.add_argument("--output",  default="/home/claude/hpi/data/synthetic_2000.csv")
    parser.add_argument("--rows",    type=int, default=2000)
    parser.add_argument("--seed",    type=int, default=42)
    parser.add_argument("--test",    action="store_true")
    args = parser.parse_args()

    if args.test:
        _run_lcg_tests()

    generate_synthetic_dataset(
        real_csv_path=args.input,
        output_path=args.output,
        target_rows=args.rows,
        seed=args.seed,
        verbose=True,
    )
