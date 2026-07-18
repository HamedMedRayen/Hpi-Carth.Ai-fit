"""
HPI — Database Layer (Supabase / PostgreSQL)
==================================================
Replaces the SQLite layer.  Uses psycopg2 with RealDictCursor so every
row comes back as a plain dict — same interface the rest of the app expects.

Key differences from SQLite version:
  • Placeholder  ?  →  %s
  • AUTOINCREMENT  →  BIGSERIAL
  • datetime('now')  →  NOW()
  • No PRAGMA statements
  • conn.row_factory  →  cursor_factory=RealDictCursor
  • lastrowid  →  RETURNING id  (see repositories)
"""

import os
import psycopg2
import psycopg2.extras
import psycopg2.errors
import psycopg2.pool
import sys
from pathlib import Path
from typing import Generator

sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import settings

BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def exercise_urls(row: dict) -> dict:
    """Convert relative image/gif paths to full URLs."""
    row["image_url"] = f"{BASE_URL}/exercises-dataset/{row['image_path']}" if row.get("image_path") else None
    row["gif_url"]   = f"{BASE_URL}/exercises-dataset/{row['gif_path']}"   if row.get("gif_path")   else None
    return row


SCHEMA_SQL = """
-- ── Auth users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_users (
    id            BIGSERIAL PRIMARY KEY,
    nickname      TEXT      UNIQUE, -- Optional if using email
    email         TEXT      UNIQUE, -- Required for Gmail/Email-code
    password_hash TEXT,             -- Nullable for OAuth/Email-code users
    provider      TEXT      DEFAULT 'local', -- 'local', 'google', 'email-code'
    email_otp     TEXT,             -- For email-code login
    email_otp_exp TIMESTAMPTZ,      -- OTP expiry
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (profile) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL PRIMARY KEY,
    auth_id      BIGINT REFERENCES auth_users(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    email        TEXT    UNIQUE NOT NULL,
    bodyweight   REAL    DEFAULT 0.0,
    sex          TEXT    DEFAULT 'M',
    age          INTEGER DEFAULT 0,
    height_cm    REAL    DEFAULT 0.0,
    experience   TEXT    DEFAULT 'beginner',
    goal         TEXT    DEFAULT 'general',
    hypertension TEXT    DEFAULT 'No',
    diabetes     TEXT    DEFAULT 'No',
    role         TEXT    DEFAULT 'athlete',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    avatar_url   TEXT
);

-- ── Body parts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_parts (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- ── Equipment ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_catalog (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- ── Exercises ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
    id                BIGSERIAL PRIMARY KEY,
    name              TEXT UNIQUE NOT NULL,
    body_part_id      BIGINT REFERENCES body_parts(id),
    muscle_group      TEXT DEFAULT 'unknown',
    equipment         TEXT DEFAULT 'unknown',
    primary_muscles   TEXT DEFAULT '',
    secondary_muscles TEXT DEFAULT '',
    description       TEXT DEFAULT '',
    external_uuid     TEXT DEFAULT NULL,
    gif_url           TEXT DEFAULT NULL,
    instructions      TEXT DEFAULT NULL,
    source            TEXT DEFAULT 'user'
);

-- ── Custom exercises ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_exercises (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    body_part         TEXT NOT NULL,
    primary_muscles   TEXT[] DEFAULT ARRAY[]::TEXT[],
    equipment         TEXT DEFAULT '',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workouts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_number INTEGER NOT NULL,
    workout_name   TEXT    NOT NULL,
    session_date   TEXT    NOT NULL,
    duration_sec   INTEGER DEFAULT 0,
    notes          TEXT    DEFAULT '',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sets ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sets (
    id          BIGSERIAL PRIMARY KEY,
    workout_id  BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id BIGINT NOT NULL REFERENCES exercises(id),
    set_order   TEXT   NOT NULL,
    weight_kg   REAL   DEFAULT 0.0,
    reps        INTEGER DEFAULT 0,
    rpe         REAL   DEFAULT NULL,
    distance_m  REAL   DEFAULT NULL,
    duration_s  REAL   DEFAULT NULL,
    one_rm_est  REAL   DEFAULT 0.0,
    volume_load REAL   DEFAULT 0.0,
    set_type    TEXT   DEFAULT 'normal'
);

-- ── Metrics ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metrics (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id        BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    session_date      TEXT   NOT NULL,
    total_volume      REAL   DEFAULT 0.0,
    total_sets        INTEGER DEFAULT 0,
    total_reps        INTEGER DEFAULT 0,
    avg_intensity     REAL   DEFAULT 0.0,
    max_1rm           REAL   DEFAULT 0.0,
    dominant_exercise TEXT   DEFAULT '',
    fatigue_index     REAL   DEFAULT 0.0,
    inol              REAL   DEFAULT 0.0,
    pca_component_1   REAL   DEFAULT 0.0,
    pca_component_2   REAL   DEFAULT 0.0,
    predicted_volume  REAL   DEFAULT 0.0,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Personal records ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_records (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id   BIGINT NOT NULL REFERENCES exercises(id),
    achieved_date TEXT   NOT NULL,
    weight_kg     REAL   NOT NULL,
    reps          INTEGER NOT NULL,
    one_rm_est    REAL   NOT NULL,
    workout_id    BIGINT REFERENCES workouts(id)
);

-- ── Recommendation history ───────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_history (
    user_id  BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_id  TEXT NOT NULL,
    shown_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recommendation rules ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_rules (
    id           BIGSERIAL PRIMARY KEY,
    sex          TEXT NOT NULL,
    bmi_level    TEXT NOT NULL,
    goal         TEXT NOT NULL,
    hypertension TEXT DEFAULT 'No',
    diabetes     TEXT DEFAULT 'No',
    fitness_type TEXT,
    exercises    TEXT,
    equipment    TEXT,
    diet         TEXT
);

-- ── Workout Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_templates (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    exercises    JSONB NOT NULL DEFAULT '[]',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Plans (Programs) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_plans (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT,
    split_type     TEXT,
    level          TEXT,
    goal           TEXT,
    days_per_week  INTEGER,
    duration_weeks INTEGER DEFAULT 4,
    weekly_schedule JSONB NOT NULL DEFAULT '{}',
    sessions       JSONB NOT NULL DEFAULT '[]',
    equipment      TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Body Weight Logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bodyweight_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg    REAL NOT NULL,
    logged_at    DATE NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, logged_at)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sets_workout       ON sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise      ON sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_metrics_user_date  ON metrics(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise  ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_body     ON exercises(body_part_id);
CREATE INDEX IF NOT EXISTS idx_auth_nickname      ON auth_users(nickname);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user ON custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_body_part ON custom_exercises(body_part);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_bodyweight_logs_user ON bodyweight_logs(user_id, logged_at DESC);

-- ── Fatigue Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fatigue_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_score   FLOAT NOT NULL,
    borg_score  FLOAT NOT NULL,
    level       INT NOT NULL,
    label       TEXT NOT NULL,
    answers     JSONB NOT NULL,
    logged_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fatigue_logs_user ON fatigue_logs(user_id);

-- ── Weight Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weight_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       DATE NOT NULL,
    weight     FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id);

-- ── Progress Photos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_photos (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url   TEXT NOT NULL,
    weight      FLOAT,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user ON progress_photos(user_id, date DESC);

-- ── Nutrition Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_name   TEXT,
    description TEXT,
    calories    INT,
    protein_g   FLOAT,
    carbs_g     FLOAT,
    fat_g       FLOAT,
    fiber_g     FLOAT,
    date        DATE DEFAULT CURRENT_DATE,
    logged_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user ON nutrition_logs(user_id, date DESC);

-- ── Food Items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_items (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    brand         TEXT,
    category      TEXT,
    calories      REAL DEFAULT 0.0,
    protein_g     REAL DEFAULT 0.0,
    carbs_g       REAL DEFAULT 0.0,
    fat_g         REAL DEFAULT 0.0,
    fiber_g       REAL DEFAULT 0.0,
    serving_size  REAL DEFAULT 100.0,
    serving_unit  TEXT DEFAULT 'g', -- 'g', 'ml', 'oz', 'serving'
    is_branded    BOOLEAN DEFAULT FALSE,
    is_user_added BOOLEAN DEFAULT FALSE,
    created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);

-- ── Recipes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT,
    servings      REAL DEFAULT 1.0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recipe Ingredients ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id            BIGSERIAL PRIMARY KEY,
    recipe_id     BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_id       BIGINT REFERENCES food_items(id) ON DELETE CASCADE,
    amount        REAL NOT NULL,
    unit          TEXT DEFAULT 'g'
);

-- ── Saved Meals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_meals (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    items         JSONB NOT NULL, -- Array of {food_id, amount, unit} or {recipe_id, amount, unit}
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sleep Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sleep_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    hours        FLOAT NOT NULL,
    quality      INT NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user ON sleep_logs(user_id, date DESC);

-- ── Injury Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS injury_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_part    TEXT NOT NULL,
    severity     INT NOT NULL,
    description  TEXT,
    status       TEXT DEFAULT 'active', -- 'active', 'healed'
    start_date   DATE DEFAULT CURRENT_DATE,
    end_date     DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_injury_logs_user ON injury_logs(user_id, status);

-- ── Coach Relationships ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_relationships (
    id          BIGSERIAL PRIMARY KEY,
    coach_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    athlete_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT DEFAULT 'pending',
    initiated_by TEXT DEFAULT 'coach',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, athlete_id)
);

-- ── User Challenges ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_challenges (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id   TEXT NOT NULL,
    status         TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    progress_days  JSONB DEFAULT '[]',     -- Array of objects [{day: 1, date: '2024-05-01', status: 'done'}]
    started_at     TIMESTAMPTZ DEFAULT NOW(),
    completed_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_challenges_active_user ON user_challenges(user_id) WHERE status = 'active';

-- ── Coach Notes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_notes (
    id          BIGSERIAL PRIMARY KEY,
    coach_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    athlete_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rest Days ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rest_days (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_rest_days_user ON rest_days(user_id, date DESC);

-- ── Notifications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id   BIGINT REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT,
    data        JSONB,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ── Chat Messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(sender_id, receiver_id);

-- ── Nutrition Targets ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_targets (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Original Suggestions (System Generated)
    suggested_calories FLOAT NOT NULL,
    suggested_protein  FLOAT NOT NULL,
    suggested_carbs    FLOAT NOT NULL,
    suggested_fat      FLOAT NOT NULL,
    
    -- Final Values (User Adjusted)
    final_calories     FLOAT NOT NULL,
    final_protein      FLOAT NOT NULL,
    final_carbs        FLOAT NOT NULL,
    final_fat          FLOAT NOT NULL,
    
    -- Meta
    goal               TEXT NOT NULL, 
    pace               TEXT NOT NULL, 
    diet_style         TEXT NOT NULL, 
    
    maintenance_calories FLOAT NOT NULL,
    expected_weekly_change FLOAT NOT NULL,
    
    created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_targets_user ON nutrition_targets(user_id, created_at DESC);

-- ── RLS Policies (must be enabled in Supabase Dashboard) ──────
-- For custom_exercises table:
-- ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY custom_exercises_own ON custom_exercises FOR ALL
--   USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
"""


def _raw_connection() -> psycopg2.extensions.connection:
    """Return a new (non-pooled) psycopg2 connection. Used by init_db only."""
    conn = psycopg2.connect(
        settings.DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor
    )
    return conn


def init_db() -> None:
    """Create all tables and indexes (idempotent)."""
    import time
    max_retries = 3
    for attempt in range(max_retries):
        try:
            _do_init_db()
            return
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            if attempt < max_retries - 1:
                wait = (attempt + 1) * 2
                print(f"[DB] Connection error during init: {str(e)[:100]}. Retrying in {wait}s... ({attempt+1}/{max_retries})", flush=True)
                time.sleep(wait)
            else:
                raise

def _do_init_db() -> None:
    """Actual initialization logic."""
    import sys
    conn = _raw_connection()
    try:
        with conn.cursor() as cur:
            # Execute each statement separately to avoid query timeout
            print("[DB] Starting schema creation...", flush=True)
            statements = [s.strip() for s in SCHEMA_SQL.split(';') if s.strip()]
            print(f"[DB] Found {len(statements)} statements to execute", flush=True)
            
            # Separate table creation from index creation
            table_statements = [s for s in statements if 'CREATE TABLE' in s]
            index_statements = [s for s in statements if 'CREATE INDEX' in s]
            
            print(f"[DB] {len(table_statements)} table statements, {len(index_statements)} index statements", flush=True)
            
            # Execute tables first
            for i, statement in enumerate(table_statements, 1):
                try:
                    print(f"[DB] Creating table {i}/{len(table_statements)}...", flush=True)
                    cur.execute(statement)
                except Exception as e:
                    print(f"[DB] Table {i} note: {str(e)[:60]}", flush=True)
            
            # Commit table creation
            conn.commit()
            
            # Finally indexes - each in their own transaction
            for i, statement in enumerate(index_statements, 1):
                try:
                    if conn.closed != 0:
                        print("[DB] Connection lost before index creation, reconnecting...", flush=True)
                        conn = _raw_connection()
                        cur = conn.cursor()
                    
                    print(f"[DB] Creating index {i}/{len(index_statements)}...", flush=True)
                    cur.execute("SET statement_timeout = 30000")  # 30 seconds for indices
                    cur.execute(statement)
                    conn.commit()
                except psycopg2.errors.QueryCanceled:
                    try: conn.rollback()
                    except: pass
                    print(f"[DB] Index {i} timeout (skipping)", flush=True)
                except Exception as e:
                    try: conn.rollback()
                    except: pass
                    error_msg = str(e)[:80]
                    if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                        print(f"[DB] Index {i} already exists", flush=True)
                    else:
                        print(f"[DB] Index {i} note: {error_msg}", flush=True)
        
        # Run migrations (add missing columns, etc.)
        print("[DB] Running migrations...", flush=True)
        if conn.closed != 0:
            conn = _raw_connection()
        with conn.cursor() as cur:
            try:
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT DEFAULT NULL")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions TEXT DEFAULT NULL")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_id TEXT")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category TEXT")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS target TEXT")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_path TEXT")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_path TEXT")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instruction_steps JSONB")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE")
                cur.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by BIGINT")
                
                # --- NEW AUTH MIGRATIONS ---
                cur.execute("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE")
                cur.execute("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local'")
                cur.execute("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email_otp TEXT")
                cur.execute("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email_otp_exp TIMESTAMPTZ")
                cur.execute("ALTER TABLE auth_users ALTER COLUMN nickname DROP NOT NULL")
                cur.execute("ALTER TABLE auth_users ALTER COLUMN password_hash DROP NOT NULL")
                
                # --- INJURY LOGS MIGRATIONS ---
                cur.execute("ALTER TABLE injury_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'")

                # --- USER PROFILE MIGRATIONS ---
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'athlete'")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_url TEXT")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
                
                # --- COACH RELATIONSHIPS MIGRATIONS ---
                cur.execute("ALTER TABLE coach_relationships ADD COLUMN IF NOT EXISTS initiated_by TEXT DEFAULT 'coach'")
                
                # --- GYMS & MAP MIGRATIONS ---
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS gyms (
                        id BIGSERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        address TEXT,
                        latitude DOUBLE PRECISION NOT NULL,
                        longitude DOUBLE PRECISION NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS coach_gyms (
                        id BIGSERIAL PRIMARY KEY,
                        coach_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                        gym_id BIGINT REFERENCES gyms(id) ON DELETE CASCADE,
                        UNIQUE(coach_id, gym_id)
                    )
                """)
                
                # Seed Gyms
                cur.execute("SELECT COUNT(*) as count FROM gyms")
                if cur.fetchone()["count"] == 0:
                    gyms_data = [
                        ("California Gym (Lac 2)", "Les Berges du Lac 2, Tunis", 36.8475, 10.2652),
                        ("California Gym (Ben Arous)", "Avenue de France, Ben Arous", 36.7533, 10.2223),
                        ("California Gym (Ennasr)", "Avenue Hédi Nouira, Ennasr 2", 36.8576, 10.1704),
                        ("Oxygen Gym (Megrine)", "Rue de la Gare, Megrine, Ben Arous", 36.7441, 10.2285),
                        ("Giga Fit (Lac 1)", "Les Berges du Lac 1, Tunis", 36.8378, 10.2392),
                        ("Titanium Gym (La Marsa)", "La Marsa, Tunis", 36.8858, 10.3228),
                        ("Pro Fitness (Sousse)", "Route Touristique, Sousse", 35.8256, 10.6369),
                        ("Gym Box (El Manar)", "El Manar 2, Tunis", 36.8329, 10.1492),
                        ("California Gym (Sfax)", "Route de Teniour, Sfax", 34.7406, 10.7603),
                        ("The Fit Loft (La Soukra)", "Avenue de l'UMA, La Soukra", 36.8647, 10.2238)
                    ]
                    for g_name, addr, lat, lng in gyms_data:
                        cur.execute(
                            "INSERT INTO gyms (name, address, latitude, longitude) VALUES (%s, %s, %s, %s)",
                            (g_name, addr, lat, lng)
                        )
                    
                    # Fetch all coaches
                    cur.execute("SELECT id, email FROM users WHERE role = 'coach'")
                    coaches = cur.fetchall()
                    
                    # Map coaches to gyms
                    mappings = {
                        "youssef.mansour@hpi.fit": ["California Gym (Ben Arous)", "Oxygen Gym (Megrine)"],
                        "fatima.alharbi@hpi.fit": ["California Gym (Ennasr)", "The Fit Loft (La Soukra)"],
                        "tarek.kabbani@hpi.fit": ["California Gym (Lac 2)", "Giga Fit (Lac 1)"],
                        "layla.haddad@hpi.fit": ["Titanium Gym (La Marsa)", "Gym Box (El Manar)"],
                        "karim.nour@hpi.fit": ["California Gym (Ben Arous)", "Oxygen Gym (Megrine)"],
                        "hamza.zein@hpi.fit": ["Pro Fitness (Sousse)"],
                        "amira.fakhoury@hpi.fit": ["California Gym (Sfax)"],
                        "rami.halabi@hpi.fit": ["Giga Fit (Lac 1)", "The Fit Loft (La Soukra)"],
                        "yasmin.shahin@hpi.fit": ["Titanium Gym (La Marsa)", "Gym Box (El Manar)"],
                        "omar.farooq@hpi.fit": ["California Gym (Ben Arous)", "California Gym (Lac 2)"]
                    }
                    
                    for row in coaches:
                        c_id = row["id"]
                        c_email = row["email"]
                        if c_email in mappings:
                            for gym_name in mappings[c_email]:
                                cur.execute("SELECT id FROM gyms WHERE name = %s", (gym_name,))
                                g_row = cur.fetchone()
                                if g_row:
                                    cur.execute(
                                        "INSERT INTO coach_gyms (coach_id, gym_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                                        (c_id, g_row["id"])
                                    )

                # --- USER CHALLENGES MIGRATIONS ---
                cur.execute("CREATE TABLE IF NOT EXISTS user_challenges (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, challenge_id TEXT NOT NULL, status TEXT DEFAULT 'active', progress_days JSONB DEFAULT '[]', started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ)")
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_challenges_active_user ON user_challenges(user_id) WHERE status = 'active'")
                
                # --- REST DAYS MIGRATIONS ---
                cur.execute("CREATE TABLE IF NOT EXISTS rest_days (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date DATE NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, date))")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_rest_days_user ON rest_days(user_id, date DESC)")

                # --- NOTIFICATIONS MIGRATIONS ---
                cur.execute("CREATE TABLE IF NOT EXISTS notifications (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT, data JSONB, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)")

                # --- USER PLANS MIGRATIONS ---
                cur.execute("CREATE TABLE IF NOT EXISTS user_plans (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, split_type TEXT, level TEXT, goal TEXT, days_per_week INTEGER, duration_weeks INTEGER DEFAULT 4, weekly_schedule JSONB NOT NULL DEFAULT '{}', sessions JSONB NOT NULL DEFAULT '[]', equipment TEXT[] DEFAULT ARRAY[]::TEXT[], created_at TIMESTAMPTZ DEFAULT NOW())")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_user_plans_user ON user_plans(user_id)")

                # --- WATER LOGS MIGRATIONS ---
                cur.execute("CREATE TABLE IF NOT EXISTS water_logs (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, amount_ml INT DEFAULT 0, date DATE NOT NULL DEFAULT CURRENT_DATE, logged_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, date))")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_water_logs_user ON water_logs(user_id, date DESC)")

                # --- COACH CHECK-INS MIGRATIONS ---
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS coach_check_ins (
                        id BIGSERIAL PRIMARY KEY,
                        coach_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        athlete_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        adherence_rate INT DEFAULT 100,
                        status_label TEXT DEFAULT 'on_track',
                        feedback TEXT NOT NULL,
                        focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_coach_check_ins_athlete ON coach_check_ins(athlete_id, created_at DESC)")

                # --- FOOD & RECIPES MIGRATIONS ---
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS food_items (
                        id BIGSERIAL PRIMARY KEY, 
                        name TEXT NOT NULL UNIQUE, 
                        brand TEXT, 
                        category TEXT, 
                        calories REAL DEFAULT 0.0, 
                        protein_g REAL DEFAULT 0.0, 
                        carbs_g REAL DEFAULT 0.0, 
                        fat_g REAL DEFAULT 0.0, 
                        fiber_g REAL DEFAULT 0.0, 
                        serving_size REAL DEFAULT 100.0, 
                        serving_unit TEXT DEFAULT 'g', 
                        is_branded BOOLEAN DEFAULT FALSE, 
                        is_user_added BOOLEAN DEFAULT FALSE, 
                        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL, 
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name)")
                
                cur.execute("CREATE TABLE IF NOT EXISTS recipes (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, servings REAL DEFAULT 1.0, created_at TIMESTAMPTZ DEFAULT NOW())")
                cur.execute("CREATE TABLE IF NOT EXISTS recipe_ingredients (id BIGSERIAL PRIMARY KEY, recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE, food_id BIGINT REFERENCES food_items(id) ON DELETE CASCADE, amount REAL NOT NULL, unit TEXT DEFAULT 'g')")
                cur.execute("CREATE TABLE IF NOT EXISTS saved_meals (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, items JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())")

                conn.commit()
                print("[DB] Migration: all exercise, auth, and chat columns added/verified.", flush=True)
            except Exception as e:
                conn.rollback()
                import traceback
                traceback.print_exc()
                print(f"[DB] Migration warning: {str(e)[:80]}", flush=True)

        # Add food items unique constraint in an isolated transaction block
        with conn.cursor() as cur:
            try:
                cur.execute("ALTER TABLE food_items ADD CONSTRAINT food_items_name_key UNIQUE (name)")
                conn.commit()
            except Exception:
                conn.rollback()
        
        # Create unique index on external_id for upsert support
        with conn.cursor() as cur:
            for idx_sql in [
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_external_id ON exercises(external_id) WHERE external_id IS NOT NULL",
                "CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category)",
                "CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment)",
                "CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group)",
            ]:
                try:
                    cur.execute(idx_sql)
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    if 'already exists' not in str(e).lower():
                        print(f"[DB] Index note: {str(e)[:60]}", flush=True)
        
        print("[DB] Supabase schema ready.", flush=True)
    except Exception as e:
        print(f"[DB] Error during init: {str(e)[:100]}", flush=True)
        try:
            conn.rollback()
        except:
            pass
        raise
    finally:
        conn.close()


# ── Connection Pool ────────────────────────────────────────────
# Reuses connections instead of creating a new one per request.
_pool = None

def _get_pool():
    """Lazily initialize a threaded connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=8,
            dsn=settings.DATABASE_URL,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
        print("[DB] Connection pool created (1-8 connections)", flush=True)
    return _pool


def get_connection() -> psycopg2.extensions.connection:
    """Return a connection from the pool (with RealDictCursor as default)."""
    try:
        return _get_pool().getconn()
    except Exception:
        # Pool might be exhausted or stale — recreate
        global _pool
        _pool = None
        return _get_pool().getconn()


def get_db() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    FastAPI dependency that yields a pooled connection and handles commit/rollback.
    Returns the connection to the pool when done.
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
