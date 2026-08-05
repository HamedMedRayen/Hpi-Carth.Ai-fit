"""
HPI — User Repository (PostgreSQL / Supabase)
Changes from SQLite:
  • ? → %s
  • lastrowid → RETURNING id
  • datetime('now') → NOW()
"""

from typing import Any, Dict, List, Optional
from .base import BaseRepository


class UserRepository(BaseRepository):

    def get_by_id(self, record_id: int) -> Optional[Dict[str, Any]]:
        return self._fetchone("SELECT * FROM users WHERE id = %s", (record_id,))

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return self._fetchone("SELECT * FROM users WHERE email = %s", (email,))

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        return self._fetchall(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (limit, offset)
        )

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        cur = self._execute(
            """
            INSERT INTO users (name, email, bodyweight, sex)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (data["name"], data["email"], data.get("bodyweight", 0.0), data.get("sex", "M"))
        )
        row = cur.fetchone()
        return self.get_by_id(row["id"])

    def update(self, record_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        fields, values = [], []

        for col in ("name", "bodyweight", "sex", "age", "height_cm",
                    "experience", "goal", "hypertension", "diabetes", "avatar_url",
                    "onboarding_completed", "onboarding_data"):
            if col in data and data[col] is not None:
                fields.append(f"{col} = %s")
                values.append(data[col])

        if not fields:
            return self.get_by_id(record_id)

        fields.append("updated_at = NOW()")
        values.append(record_id)
        self._execute(
            f"UPDATE users SET {', '.join(fields)} WHERE id = %s",
            tuple(values)
        )
        return self.get_by_id(record_id)

    def delete(self, record_id: int) -> bool:
        cur = self._execute("DELETE FROM users WHERE id = %s", (record_id,))
        return cur.rowcount > 0

    def get_stats(self, user_id: int) -> Dict[str, Any]:
        workouts = self._fetchone(
            "SELECT COUNT(*) as cnt FROM workouts WHERE user_id = %s", (user_id,)
        )
        total_workouts = workouts["cnt"] if workouts else 0

        vol = self._fetchone(
            """
            SELECT COALESCE(SUM(s.volume_load), 0) as total_vol,
                   COALESCE(COUNT(s.id), 0)        as total_sets
            FROM sets s
            JOIN workouts w ON s.workout_id = w.id
            WHERE w.user_id = %s
            """,
            (user_id,)
        )
        total_volume = float(vol["total_vol"]) if vol else 0.0
        total_sets   = int(vol["total_sets"])  if vol else 0

        dur = self._fetchone(
            "SELECT COALESCE(AVG(duration_sec), 0) as avg_dur FROM workouts WHERE user_id = %s",
            (user_id,)
        )
        avg_duration_sec = float(dur["avg_dur"]) if dur else 0.0

        fav = self._fetchone(
            """
            SELECT e.name, COUNT(s.id) as freq
            FROM sets s
            JOIN workouts w ON s.workout_id = w.id
            JOIN exercises e ON s.exercise_id = e.id
            WHERE w.user_id = %s
            GROUP BY e.id, e.name
            ORDER BY freq DESC
            LIMIT 1
            """,
            (user_id,)
        )
        favourite = fav["name"] if fav else "—"

        dates = self._fetchall(
            "SELECT DISTINCT DATE(session_date) as d FROM workouts WHERE user_id = %s ORDER BY d",
            (user_id,)
        )
        days_trained = len(dates)

        streak = 0
        if dates:
            from datetime import date, timedelta
            today    = date.today()
            date_set = {str(row["d"]) for row in dates}
            check    = today
            while str(check) in date_set:
                streak += 1
                check  -= timedelta(days=1)
            if streak == 0:
                check = today - timedelta(days=1)
                while str(check) in date_set:
                    streak += 1
                    check  -= timedelta(days=1)

        return {
            "user_id":                   user_id,
            "total_workouts":            total_workouts,
            "total_volume_kg":           round(total_volume, 2),
            "total_sets":                total_sets,
            "avg_session_duration_min":  round(avg_duration_sec / 60.0, 1),
            "favourite_exercise":        favourite,
            "days_trained":              days_trained,
            "current_streak":            streak,
        }
