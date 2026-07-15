"""
HPI — Metric Repository (PostgreSQL / Supabase)
Changes: ? → %s  |  lastrowid → RETURNING id  |  removed sqlite3 import
"""

from typing import Any, Dict, List, Optional
from .base import BaseRepository


class MetricRepository(BaseRepository):

    def get_by_id(self, record_id: int) -> Optional[Dict[str, Any]]:
        return self._fetchone("SELECT * FROM metrics WHERE id = %s", (record_id,))

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        return self._fetchall(
            "SELECT * FROM metrics ORDER BY session_date DESC LIMIT %s OFFSET %s",
            (limit, offset)
        )

    def get_by_user(
        self,
        user_id: int,
        limit: int = 200,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM metrics WHERE user_id = %s"
        params: list = [user_id]
        if start_date:
            sql += " AND session_date >= %s"
            params.append(start_date)
        if end_date:
            sql += " AND session_date <= %s"
            params.append(end_date)
        sql += " ORDER BY session_date LIMIT %s"
        params.append(limit)
        return self._fetchall(sql, tuple(params))

    def get_by_workout(self, workout_id: int) -> Optional[Dict[str, Any]]:
        return self._fetchone("SELECT * FROM metrics WHERE workout_id = %s", (workout_id,))

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        cur = self._execute(
            """
            INSERT INTO metrics (
                user_id, workout_id, session_date, total_volume, total_sets,
                total_reps, avg_intensity, max_1rm, dominant_exercise,
                fatigue_index, inol, pca_component_1, pca_component_2,
                predicted_volume
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                data["user_id"],
                data["workout_id"],
                data["session_date"],
                data.get("total_volume", 0.0),
                data.get("total_sets", 0),
                data.get("total_reps", 0),
                data.get("avg_intensity", 0.0),
                data.get("max_1rm", 0.0),
                data.get("dominant_exercise", ""),
                data.get("fatigue_index", 0.0),
                data.get("inol", 0.0),
                data.get("pca_component_1", 0.0),
                data.get("pca_component_2", 0.0),
                data.get("predicted_volume", 0.0),
            )
        )
        return self.get_by_id(cur.fetchone()["id"])

    def delete(self, record_id: int) -> bool:
        cur = self._execute("DELETE FROM metrics WHERE id = %s", (record_id,))
        return cur.rowcount > 0

    def update_pca(self, metric_id: int, pc1: float, pc2: float) -> None:
        self._execute(
            "UPDATE metrics SET pca_component_1 = %s, pca_component_2 = %s WHERE id = %s",
            (pc1, pc2, metric_id)
        )

    def update_prediction(self, metric_id: int, predicted: float) -> None:
        self._execute(
            "UPDATE metrics SET predicted_volume = %s WHERE id = %s",
            (predicted, metric_id)
        )

    def get_feature_matrix_rows(self, user_id: int) -> List[Dict[str, Any]]:
        return self._fetchall(
            """
            SELECT
                id, session_date, total_volume, total_sets, total_reps,
                avg_intensity, max_1rm, fatigue_index, inol
            FROM metrics
            WHERE user_id = %s
            ORDER BY session_date
            """,
            (user_id,)
        )
