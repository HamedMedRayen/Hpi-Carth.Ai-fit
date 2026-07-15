"""
HPI — Repository Pattern Base (PostgreSQL / Supabase)
==========================================================
Key changes from SQLite version:
  • sqlite3.Connection  →  psycopg2.extensions.connection
  • conn.execute()      →  cursor = conn.cursor(); cursor.execute()
  • sqlite3.Row         →  RealDictRow  (already dict-like via RealDictCursor)
  • row_to_dict / rows_to_dicts now just return dict(row) — same as before
  • _execute returns the cursor (not a sqlite3.Cursor), so callers that need
    lastrowid must use  RETURNING id  in their SQL and read cursor.fetchone()
"""

import psycopg2
import psycopg2.extras
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, TypeVar, Generic

T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """
    Generic repository base.  Receives a live psycopg2 connection whose
    transaction is managed externally by FastAPI's dependency-injection layer.
    """

    def __init__(self, conn: psycopg2.extensions.connection):
        self.conn = conn

    # ── Internal helpers ────────────────────────────────────────────────────

    def _cursor(self):
        """Return a RealDictCursor on the current connection."""
        return self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def _fetchone(self, sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def _fetchall(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def _execute(self, sql: str, params: tuple = ()):
        """Execute a statement and return the cursor (for RETURNING id etc.)."""
        cur = self._cursor()
        cur.execute(sql, params)
        return cur

    def _executemany(self, sql: str, params_list: List[tuple]):
        with self._cursor() as cur:
            cur.executemany(sql, params_list)

    # ── Compatibility helpers (kept for callers that used sqlite3.Row) ───────

    @staticmethod
    def row_to_dict(row) -> Optional[Dict[str, Any]]:
        if row is None:
            return None
        return dict(row)

    @staticmethod
    def rows_to_dicts(rows) -> List[Dict[str, Any]]:
        return [dict(r) for r in rows]

    # ── Abstract interface ───────────────────────────────────────────────────

    @abstractmethod
    def get_by_id(self, record_id: int) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    def get_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]: ...

    @abstractmethod
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    def delete(self, record_id: int) -> bool: ...
