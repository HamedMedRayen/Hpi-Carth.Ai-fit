"""
HPI — ExerciseDB Sync Service
===================================
Fetches exercises from ExerciseDB API and syncs GIF URLs to local database.
Matches by normalized exercise names (lowercase, no punctuation).
Also fetches detailed instructions for each exercise.

Features:
  - Exponential backoff retry logic for transient failures
  - Rate limit (429) and forbidden (403) handling
  - Configurable retry attempts and backoff strategy
  - Graceful degradation: skips sync if API unavailable
"""
import re
import json
import time
import requests
import psycopg2
import psycopg2.extras
from typing import List, Dict, Any, Optional
from functools import wraps

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import settings

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF_SEC = 2
MAX_BACKOFF_SEC = 30
BACKOFF_MULTIPLIER = 2


def retry_with_backoff(max_retries=MAX_RETRIES, initial_backoff=INITIAL_BACKOFF_SEC):
    """
    Decorator for retrying API calls with exponential backoff.
    
    Retries on:
      - Transient errors (500, 502, 503, 504)
      - Rate limiting (429)
    
    Does NOT retry on:
      - 403 Forbidden (permanent auth issue)
      - 404 Not Found (resource doesn't exist)
      - 400 Bad Request (client error)
    
    Exponential backoff: backoff = min(initial_backoff * (multiplier ** attempt), max_backoff)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.Timeout as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        print(f"[SYNC] Timeout (attempt {attempt + 1}/{max_retries}). Retrying in {backoff}s...", flush=True)
                        time.sleep(backoff)
                        backoff = min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_SEC)
                    continue
                except requests.exceptions.ConnectionError as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        print(f"[SYNC] Connection error (attempt {attempt + 1}/{max_retries}). Retrying in {backoff}s...", flush=True)
                        time.sleep(backoff)
                        backoff = min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_SEC)
                    continue
                except requests.exceptions.HTTPError as e:
                    status_code = e.response.status_code if hasattr(e, 'response') and e.response else None
                    
                    # Permanent errors: don't retry
                    if status_code in (403, 404, 400, 401):
                        print(f"[SYNC] HTTP {status_code} — {e}", flush=True)
                        raise
                    
                    # Rate limit: retry with backoff
                    if status_code == 429:
                        retry_after = e.response.headers.get('Retry-After')
                        if retry_after:
                            backoff = min(int(retry_after), MAX_BACKOFF_SEC)
                        if attempt < max_retries - 1:
                            print(f"[SYNC] Rate limited (429). Waiting {backoff}s before retry (attempt {attempt + 1}/{max_retries})...", flush=True)
                            time.sleep(backoff)
                            backoff = min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_SEC)
                        continue
                    
                    # Transient errors (5xx): retry with backoff
                    if status_code and 500 <= status_code < 600:
                        last_exception = e
                        if attempt < max_retries - 1:
                            print(f"[SYNC] Server error (HTTP {status_code}). Retrying in {backoff}s (attempt {attempt + 1}/{max_retries})...", flush=True)
                            time.sleep(backoff)
                            backoff = min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_SEC)
                        continue
                    
                    # Other HTTP errors: don't retry
                    print(f"[SYNC] HTTP error {status_code}: {e}", flush=True)
                    raise
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        print(f"[SYNC] Unexpected error (attempt {attempt + 1}/{max_retries}): {str(e)[:80]}", flush=True)
                        time.sleep(backoff)
                        backoff = min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_SEC)
                    continue
            
            # All retries exhausted
            print(f"[SYNC] Failed after {max_retries} retries. Last error: {str(last_exception)[:100]}", flush=True)
            raise last_exception if last_exception else Exception("Max retries exceeded")
        
        return wrapper
    return decorator


def normalize_name(name: str) -> str:
    """
    Normalize exercise name for matching: 
    lowercase, remove ALL non-alphanumeric chars (keep only a-z0-9).
    Example: "Bicep Curl (Dumbbell)" -> "bicepburldumbbell"
    """
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9]', '', name)
    return name


def fetch_exercisedb_exercises() -> List[Dict[str, Any]]:
    """
    Fetch all exercises from ExerciseDB API with retry logic.
    
    Returns list of exercise dicts with: name, target, bodyPart, equipment, gifUrl.
    Returns empty list on permanent errors (403) or if API key not configured.
    """
    if not settings.EXERCISEDB_API_KEY:
        print("[SYNC] EXERCISEDB_API_KEY not set. Skipping ExerciseDB sync.", flush=True)
        return []

    @retry_with_backoff(max_retries=MAX_RETRIES, initial_backoff=INITIAL_BACKOFF_SEC)
    def _fetch():
        url = "https://exercisedb.p.rapidapi.com/exercises"
        headers = {
            "X-RapidAPI-Key": settings.EXERCISEDB_API_KEY,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com"
        }
        params = {"limit": 1300}

        print("[SYNC] Fetching exercises from ExerciseDB (may take a moment)...", flush=True)
        response = requests.get(url, headers=headers, params=params, timeout=60)
        response.raise_for_status()
        exercises = response.json()
        print(f"[SYNC] ✓ Received {len(exercises)} exercises from ExerciseDB.", flush=True)
        return exercises

    try:
        return _fetch()
    except requests.exceptions.HTTPError as e:
        if e.response and e.response.status_code == 403:
            print(
                "[SYNC] ⚠️  API Key rejected (403 Forbidden). Check EXERCISEDB_API_KEY in .env",
                flush=True
            )
        return []
    except Exception as e:
        print(f"[SYNC] ✗ Failed to fetch from ExerciseDB after retries: {str(e)[:100]}", flush=True)
        return []


def fetch_exercise_details(exercise_id: str) -> Dict[str, Any]:
    """
    Fetch detailed instructions for a specific exercise by ID with retry logic.
    Returns dict with instructions array. Returns empty dict on failure.
    """
    if not settings.EXERCISEDB_API_KEY:
        return {}

    @retry_with_backoff(max_retries=2, initial_backoff=1)
    def _fetch():
        url = f"https://exercisedb.p.rapidapi.com/exercises/exercise/{exercise_id}"
        headers = {
            "X-RapidAPI-Key": settings.EXERCISEDB_API_KEY,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()

    try:
        return _fetch()
    except Exception as e:
        # Silently fail for details - we already have the basic info
        return {}


def sync_exercisedb_to_db(conn: psycopg2.extensions.connection) -> Dict[str, int]:
    """
    Sync ExerciseDB exercises to local database.
    - Match existing exercises by normalized name, update gif_url if null
    - Fetch and store instructions
    - Insert new exercises that don't exist locally
    
    Returns dict with counts: {"matched": X, "inserted": Y, "errors": Z}
    """
    exercisedb_exercises = fetch_exercisedb_exercises()
    if not exercisedb_exercises:
        print("[SYNC] No exercises to sync (API returned empty or failed).", flush=True)
        return {"matched": 0, "inserted": 0, "errors": 0}

    matched_count = 0
    inserted_count = 0
    error_count = 0

    # Get list of exercises with null gif_url from DB
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, name, body_part_id, muscle_group, equipment
            FROM exercises
            WHERE gif_url IS NULL OR gif_url = ''
        """)
        local_exercises_null_gif = cur.fetchall()

    # Create normalized name → exercise mapping for faster lookup
    local_by_name = {normalize_name(ex["name"]): ex for ex in local_exercises_null_gif}

    print(f"[SYNC] Syncing {len(exercisedb_exercises)} exercises...", flush=True)

    # Process each ExerciseDB exercise
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        for ex_db in exercisedb_exercises:
            ex_name = ex_db.get("name", "").strip()
            ex_target = ex_db.get("target", "").strip()
            ex_body_part = ex_db.get("bodyPart", "").strip()
            ex_equipment = ex_db.get("equipment", "").strip()
            ex_gif_url = ex_db.get("gifUrl", "").strip()
            ex_id = ex_db.get("id", "").strip()

            if not ex_name or not ex_gif_url:
                continue

            norm_name = normalize_name(ex_name)

            # Fetch instructions for this exercise
            instructions_json = None
            if ex_id:
                try:
                    details = fetch_exercise_details(ex_id)
                    if "instructions" in details and isinstance(details["instructions"], list):
                        instructions_json = json.dumps(details["instructions"])
                except Exception as e:
                    pass  # Silently skip if details fetch fails

            # Try to find match in local DB
            if norm_name in local_by_name:
                local_ex = local_by_name[norm_name]
                # Update gif_url and instructions for matching exercise
                try:
                    cur.execute(
                        "UPDATE exercises SET gif_url = %s, instructions = %s WHERE id = %s",
                        (ex_gif_url, instructions_json, local_ex["id"])
                    )
                    matched_count += 1
                except Exception as e:
                    error_count += 1
                    print(f"[SYNC] Update failed for {ex_name}: {str(e)[:50]}", flush=True)
            else:
                # Insert new exercise
                try:
                    # Resolve body_part_id
                    body_part_id = None
                    if ex_body_part:
                        cur.execute(
                            "SELECT id FROM body_parts WHERE LOWER(name) = LOWER(%s)",
                            (ex_body_part,)
                        )
                        bp = cur.fetchone()
                        body_part_id = bp["id"] if bp else None

                    cur.execute("""
                        INSERT INTO exercises 
                        (name, body_part_id, muscle_group, equipment, gif_url, instructions, source)
                        VALUES (%s, %s, %s, %s, %s, %s, 'exercisedb')
                    """, (ex_name, body_part_id, ex_target, ex_equipment, ex_gif_url, instructions_json))
                    inserted_count += 1
                except psycopg2.IntegrityError:
                    conn.rollback()
                    # Exercise name already exists, skip
                except Exception as e:
                    conn.rollback()
                    error_count += 1
                    print(f"[SYNC] Insert failed for {ex_name}: {str(e)[:50]}", flush=True)

    conn.commit()
    print(
        f"[SYNC] ✓ Sync complete: {matched_count} matched, {inserted_count} inserted, {error_count} errors",
        flush=True
    )
    return {"matched": matched_count, "inserted": inserted_count, "errors": error_count}


def check_and_sync_if_needed(conn: psycopg2.extensions.connection) -> None:
    """
    Check if there are exercises with null gif_url.
    If yes, run the sync with retry logic.
    Gracefully handles API failures without blocking startup.
    """
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM exercises WHERE gif_url IS NULL OR gif_url = ''")
            result = cur.fetchone()
            count = result["cnt"] if result else 0

        if count > 0:
            print(f"[SYNC] Found {count} exercises with null gif_url. Starting sync...", flush=True)
            sync_exercisedb_to_db(conn)
        else:
            print("[SYNC] All exercises have gif_url populated. ✓", flush=True)
    except Exception as e:
        print(f"[SYNC] Warning: Could not run sync check: {str(e)[:100]}", flush=True)
        # Don't fail startup if sync check fails
