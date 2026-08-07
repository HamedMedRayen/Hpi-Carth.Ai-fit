"""
HPI — Workout Repository (PostgreSQL / Supabase)
Changes: ? → %s  |  lastrowid → RETURNING id  |  removed sqlite3 import
"""

from typing import Any, Dict, List, Optional
from .base import BaseRepository


class WorkoutRepository(BaseRepository):

    # ── Exercises ─────────────────────────────────────────────

    def get_or_create_exercise(self, name: str, muscle_group: str = "unknown") -> int:
        clean_name = name.strip() if name else ""
        row = self._fetchone("SELECT id FROM exercises WHERE LOWER(name) = LOWER(%s)", (clean_name,))
        if row:
            return row["id"]

        try:
            from services.exercise_service import get_exercise_by_id_or_name
            matched = get_exercise_by_id_or_name(self.db, clean_name)
            if matched and matched.get("id"):
                return matched["id"]
        except Exception:
            pass

        cur = self._execute(
            "INSERT INTO exercises (name, muscle_group) VALUES (%s, %s) RETURNING id",
            (clean_name, muscle_group)
        )
        return cur.fetchone()["id"]

    def list_exercises(self) -> List[Dict[str, Any]]:
        return self._fetchall("SELECT * FROM exercises WHERE (is_custom = TRUE OR image_path IS NOT NULL OR gif_path IS NOT NULL OR gif_url IS NOT NULL) ORDER BY name")

    # ── Workouts ──────────────────────────────────────────────

    def get_by_id(self, record_id: int) -> Optional[Dict[str, Any]]:
        return self._fetchone("SELECT * FROM workouts WHERE id = %s", (record_id,))

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        return self._fetchall(
            "SELECT * FROM workouts ORDER BY session_date DESC LIMIT %s OFFSET %s",
            (limit, offset)
        )

    def get_by_user(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM workouts WHERE user_id = %s"
        params: list = [user_id]
        if start_date:
            sql += " AND session_date >= %s"
            params.append(start_date)
        if end_date:
            sql += " AND session_date <= %s"
            params.append(end_date)
        sql += " ORDER BY session_date DESC LIMIT %s OFFSET %s"
        params += [limit, offset]
        return self._fetchall(sql, tuple(params))

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        row = self._fetchone(
            "SELECT COALESCE(MAX(workout_number), 0) + 1 as next_num FROM workouts WHERE user_id = %s",
            (data["user_id"],)
        )
        next_num = row["next_num"] if row else 1
        cur = self._execute(
            """
            INSERT INTO workouts (user_id, workout_number, workout_name, session_date, duration_sec, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data["user_id"],
                data.get("workout_number", next_num),
                data["workout_name"],
                data["session_date"],
                data.get("duration_sec", 0),
                data.get("notes", ""),
            )
        )
        return self.get_by_id(cur.fetchone()["id"])

    def delete(self, record_id: int) -> bool:
        cur = self._execute("DELETE FROM workouts WHERE id = %s", (record_id,))
        return cur.rowcount > 0

    def get_workout_count_by_user(self, user_id: int) -> int:
        row = self._fetchone(
            "SELECT COUNT(*) as cnt FROM workouts WHERE user_id = %s", (user_id,)
        )
        return row["cnt"] if row else 0

    # ── Sets ──────────────────────────────────────────────────

    def get_sets(self, workout_id: int) -> List[Dict[str, Any]]:
        return self._fetchall(
            """
            SELECT s.*, e.name as exercise_name
            FROM sets s
            JOIN exercises e ON s.exercise_id = e.id
            WHERE s.workout_id = %s
            ORDER BY s.id
            """,
            (workout_id,)
        )

    def insert_set(self, data: Dict[str, Any]) -> int:
        cur = self._execute(
            """
            INSERT INTO sets
                (workout_id, exercise_id, set_order, weight_kg, reps, rpe,
                 distance_m, duration_s, one_rm_est, volume_load)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data["workout_id"],
                data["exercise_id"],
                data["set_order"],
                data.get("weight_kg", 0.0),
                data.get("reps", 0),
                data.get("rpe"),
                data.get("distance_m"),
                data.get("duration_s"),
                data.get("one_rm_est", 0.0),
                data.get("volume_load", 0.0),
            )
        )
        return cur.fetchone()["id"]

    def insert_sets_bulk(self, sets_data: List[Dict[str, Any]]) -> int:
        count = 0
        for s in sets_data:
            self.insert_set(s)
            count += 1
        return count

    # ── Workout detail (with sets) ────────────────────────────

    def get_workout_detail(self, workout_id: int) -> Optional[Dict[str, Any]]:
        workout = self.get_by_id(workout_id)
        if not workout:
            return None
        sets = self.get_sets(workout_id)
        total_volume = sum(s["volume_load"] for s in sets)
        working_sets = [s for s in sets if s["set_order"] not in ("W", "Rest Timer")]
        ex_volume: Dict[str, float] = {}
        for s in working_sets:
            name = s.get("exercise_name", "")
            ex_volume[name] = ex_volume.get(name, 0.0) + s["volume_load"]
        top_ex = max(ex_volume, key=ex_volume.get) if ex_volume else ""
        workout["sets"]         = sets
        workout["total_volume"] = round(total_volume, 2)
        workout["total_sets"]   = len(working_sets)
        workout["top_exercise"] = top_ex
        return workout

    # ── Summaries ─────────────────────────────────────────────

    def get_workout_summaries(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        return self._fetchall(
            """
            SELECT
                w.id, w.workout_number, w.workout_name,
                w.session_date, w.duration_sec,
                COALESCE(SUM(s.volume_load), 0) as total_volume,
                COUNT(CASE WHEN s.set_order NOT IN ('W','Rest Timer') THEN 1 END) as total_sets,
                COUNT(DISTINCT s.exercise_id) as exercises_count
            FROM workouts w
            LEFT JOIN sets s ON w.id = s.workout_id
            WHERE w.user_id = %s
            GROUP BY w.id, w.workout_number, w.workout_name, w.session_date, w.duration_sec
            ORDER BY w.session_date DESC
            LIMIT %s
            """,
            (user_id, limit)
        )

    # ── Personal Records ──────────────────────────────────────

    def get_personal_records(
        self, user_id: int, exercise_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        sql = """
            SELECT pr.*, e.name as exercise_name
            FROM personal_records pr
            JOIN exercises e ON pr.exercise_id = e.id
            WHERE pr.user_id = %s
        """
        params: list = [user_id]
        if exercise_name:
            sql += " AND e.name = %s"
            params.append(exercise_name)
        sql += " ORDER BY pr.one_rm_est DESC"
        return self._fetchall(sql, tuple(params))

    def upsert_personal_record(self, data: Dict[str, Any]) -> None:
        existing = self._fetchone(
            """
            SELECT id, one_rm_est FROM personal_records
            WHERE user_id = %s AND exercise_id = %s
            """,
            (data["user_id"], data["exercise_id"])
        )
        if existing is None:
            self._execute(
                """
                INSERT INTO personal_records
                    (user_id, exercise_id, achieved_date, weight_kg, reps, one_rm_est, workout_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    data["user_id"], data["exercise_id"],
                    data["achieved_date"], data["weight_kg"],
                    data["reps"], data["one_rm_est"], data.get("workout_id")
                )
            )
        elif data["one_rm_est"] > existing["one_rm_est"]:
            self._execute(
                """
                UPDATE personal_records
                SET achieved_date = %s, weight_kg = %s, reps = %s,
                    one_rm_est = %s, workout_id = %s
                WHERE id = %s
                """,
                (
                    data["achieved_date"], data["weight_kg"],
                    data["reps"], data["one_rm_est"],
                    data.get("workout_id"), existing["id"]
                )
            )

    # ── Volume timeseries ─────────────────────────────────────

    def get_volume_timeseries(
        self,
        user_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        sql = """
            SELECT
                DATE(w.session_date) as date,
                SUM(s.volume_load) as volume,
                COUNT(CASE WHEN s.set_order NOT IN ('W','Rest Timer') THEN 1 END) as sets
            FROM workouts w
            JOIN sets s ON w.id = s.workout_id
            WHERE w.user_id = %s
        """
        params: list = [user_id]
        if start_date:
            sql += " AND w.session_date >= %s"
            params.append(start_date)
        if end_date:
            sql += " AND w.session_date <= %s"
            params.append(end_date)
        sql += " GROUP BY DATE(w.session_date) ORDER BY date"
        return self._fetchall(sql, tuple(params))

    def get_exercise_progress(
        self, user_id: int, exercise_name: str
    ) -> List[Dict[str, Any]]:
        return self._fetchall(
            """
            SELECT
                DATE(w.session_date) as date,
                MAX(s.one_rm_est) as max_1rm,
                MAX(s.weight_kg) as max_weight,
                SUM(s.volume_load) as total_volume
            FROM sets s
            JOIN workouts w ON s.workout_id = w.id
            JOIN exercises e ON s.exercise_id = e.id
            WHERE w.user_id = %s AND e.name = %s
              AND s.set_order NOT IN ('W', 'Rest Timer')
            GROUP BY DATE(w.session_date)
            ORDER BY date
            """,
            (user_id, exercise_name)
        )

    def get_heatmap_data(self, user_id: int) -> List[Dict[str, Any]]:
        return self._fetchall(
            """
            SELECT
                DATE(w.session_date) as date,
                SUM(s.volume_load) as value,
                w.workout_name
            FROM workouts w
            LEFT JOIN sets s ON w.id = s.workout_id
            WHERE w.user_id = %s
            GROUP BY DATE(w.session_date), w.workout_name
            ORDER BY date
            """,
            (user_id,)
        )
