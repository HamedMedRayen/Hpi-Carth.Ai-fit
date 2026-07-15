"""
HPI — Seed exercises from local dataset (1324 exercises)
Reads exercises-dataset-main/data/exercises.json and upserts into exercises table.
"""

import json
import os
import sys
from pathlib import Path

DATASET = Path(__file__).parent.parent.parent / "exercises-dataset-main" / "data" / "exercises.json"


def seed(conn):
    """Seed exercises from the local dataset JSON."""
    if not DATASET.exists():
        print(f"[SEED] Dataset not found at {DATASET}")
        return 0

    data = json.loads(DATASET.read_text(encoding="utf-8"))
    inserted = updated = skipped = 0

    cursor = conn.cursor()

    # Ensure the unique index exists
    try:
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_external_id
            ON exercises(external_id) WHERE external_id IS NOT NULL
        """)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[SEED] Index creation note: {str(e)[:80]}")

    for ex in data:
        try:
            # Extract English instructions
            instructions_en = ""
            if isinstance(ex.get("instructions"), dict):
                instructions_en = ex["instructions"].get("en", "")
            elif isinstance(ex.get("instructions"), str):
                instructions_en = ex["instructions"]

            # Extract English instruction steps
            steps_en = []
            if isinstance(ex.get("instruction_steps"), dict):
                steps_en = ex["instruction_steps"].get("en", [])
            elif isinstance(ex.get("instruction_steps"), list):
                steps_en = ex["instruction_steps"]

            # Secondary muscles
            secondary = ex.get("secondary_muscles", [])
            if isinstance(secondary, str):
                secondary = [secondary]

            ext_id = ex["id"]

            # Check if already exists
            cursor.execute(
                "SELECT id FROM exercises WHERE external_id = %s",
                (ext_id,)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing
                cursor.execute("""
                    UPDATE exercises SET
                        name              = %s,
                        category          = %s,
                        equipment         = %s,
                        muscle_group      = %s,
                        target            = %s,
                        primary_muscles   = %s,
                        secondary_muscles = %s,
                        image_path        = %s,
                        gif_path          = %s,
                        instructions      = %s,
                        instruction_steps = %s,
                        is_custom         = FALSE,
                        source            = 'dataset'
                    WHERE external_id = %s
                """, (
                    ex["name"],
                    ex.get("category", ""),
                    ex.get("equipment", ""),
                    ex.get("muscle_group", ""),
                    ex.get("target", ""),
                    ex.get("target", ""),
                    ",".join(secondary) if secondary else "",
                    ex.get("image"),
                    ex.get("gif_url"),
                    instructions_en,
                    json.dumps(steps_en),
                    ext_id,
                ))
                updated += 1
            else:
                # Insert new
                cursor.execute("""
                    INSERT INTO exercises
                        (external_id, name, category, body_part_id, equipment,
                         muscle_group, primary_muscles, secondary_muscles, target,
                         instructions, instruction_steps, image_path, gif_path,
                         is_custom, source)
                    VALUES (
                        %s, %s, %s, NULL, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        FALSE, 'dataset'
                    )
                """, (
                    ext_id,
                    ex["name"],
                    ex.get("category", ""),
                    ex.get("equipment", ""),
                    ex.get("muscle_group", ""),
                    ex.get("target", ""),
                    ",".join(secondary) if secondary else "",
                    ex.get("target", ""),
                    instructions_en,
                    json.dumps(steps_en),
                    ex.get("image"),
                    ex.get("gif_url"),
                ))
                inserted += 1

            # Commit every 50 rows to avoid huge transactions
            if (inserted + updated) % 50 == 0:
                conn.commit()

        except Exception as e:
            print(f"[SEED] Skipped {ex.get('id')}: {str(e)[:80]}")
            skipped += 1
            conn.rollback()

    conn.commit()
    cursor.close()
    print(f"[SEED] Dataset exercises — inserted: {inserted}, updated: {updated}, skipped: {skipped}")
    return inserted + updated


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from database import get_connection
    conn = get_connection()
    seed(conn)
    conn.close()
