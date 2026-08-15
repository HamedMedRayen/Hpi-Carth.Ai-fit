"""
HPI — Report Repository
Handles database operations for user-submitted coach and bug reports.
"""

from typing import Any, Dict, List, Optional
import psycopg2
from repositories.base import BaseRepository


class ReportRepository(BaseRepository[Dict[str, Any]]):

    def get_by_id(self, record_id: int) -> Optional[Dict[str, Any]]:
        return self._fetchone("SELECT * FROM reports WHERE id = %s", (record_id,))

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        return self._fetchall("SELECT * FROM reports ORDER BY id DESC LIMIT %s OFFSET %s", (limit, offset))

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if data.get("report_type") == "coach":
            return self.create_coach_report(
                reporter_id=data["reporter_id"],
                coach_id=data["coach_id"],
                category=data["category"],
                description=data["description"]
            )
        return self.create_bug_report(
            reporter_id=data["reporter_id"],
            category=data["category"],
            description=data["description"],
            screenshot_url=data.get("screenshot_url"),
            app_context=data.get("app_context")
        )

    def delete(self, record_id: int) -> bool:
        cur = self._execute("DELETE FROM reports WHERE id = %s", (record_id,))
        self.conn.commit()
        return cur.rowcount > 0

    def create_coach_report(
        self,
        reporter_id: int,
        coach_id: int,
        category: str,
        description: str
    ) -> Dict[str, Any]:
        sql = """
            INSERT INTO reports (reporter_id, report_type, target_user_id, category, description, status, created_at)
            VALUES (%s, 'coach', %s, %s, %s, 'open', NOW())
            RETURNING id, reporter_id, report_type, target_user_id, category, description, status, created_at
        """
        row = self._fetchone(sql, (reporter_id, coach_id, category, description))
        self.conn.commit()
        if row and row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
        return row

    def create_bug_report(
        self,
        reporter_id: int,
        category: str,
        description: str,
        screenshot_url: Optional[str] = None,
        app_context: Optional[str] = None
    ) -> Dict[str, Any]:
        sql = """
            INSERT INTO reports (reporter_id, report_type, category, description, screenshot_url, app_context, status, created_at)
            VALUES (%s, 'bug', %s, %s, %s, %s, 'open', NOW())
            RETURNING id, reporter_id, report_type, category, description, screenshot_url, app_context, status, created_at
        """
        row = self._fetchone(sql, (reporter_id, category, description, screenshot_url, app_context))
        self.conn.commit()
        if row and row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
        return row

    def get_user_reports(self, user_id: int) -> List[Dict[str, Any]]:
        sql = """
            SELECT 
                r.*,
                targ.name as target_user_name
            FROM reports r
            LEFT JOIN users targ ON r.target_user_id = targ.id
            WHERE r.reporter_id = %s
            ORDER BY r.created_at DESC
        """
        rows = self._fetchall(sql, (user_id,))
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
            if r.get("resolved_at"):
                r["resolved_at"] = r["resolved_at"].isoformat()
        return rows
