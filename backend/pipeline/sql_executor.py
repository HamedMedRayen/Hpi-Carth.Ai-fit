"""
HPI RAG — Stage 1D: SQL Executor (DuckDB over pandas)
======================================================
Loads gym_recommendation.xlsx into a pandas DataFrame once, registers it
as a DuckDB virtual table called `gym_data`, and exposes functions to
execute read-only SQL and extract candidate IDs.
"""

import logging
from typing import List

import duckdb
import pandas as pd

from rag_config import EXCEL_PATH, DUCKDB_TABLE

log = logging.getLogger("hpi.rag.sql_executor")

# ── Module-level cache ─────────────────────────────────────────
_df: pd.DataFrame = None
_duckdb_conn: duckdb.DuckDBPyConnection = None


def _init_duckdb():
    """Load Excel into pandas and register with DuckDB (once)."""
    global _df, _duckdb_conn

    if _duckdb_conn is not None:
        return

    log.info(f"[SQL_EXECUTOR] Loading Excel: {EXCEL_PATH}")
    _df = pd.read_excel(EXCEL_PATH, engine="openpyxl")
    log.info(f"[SQL_EXECUTOR] Loaded {len(_df)} rows, {len(_df.columns)} columns")

    # Create an in-memory DuckDB connection and register the DataFrame
    _duckdb_conn = duckdb.connect(":memory:")
    _duckdb_conn.register(DUCKDB_TABLE, _df)
    log.info(f"[SQL_EXECUTOR] Registered as DuckDB table '{DUCKDB_TABLE}'")

    # Verify
    count = _duckdb_conn.execute(f"SELECT COUNT(*) FROM {DUCKDB_TABLE}").fetchone()[0]
    log.info(f"[SQL_EXECUTOR] DuckDB table has {count} rows")


def execute_sql(query: str) -> pd.DataFrame:
    """
    Execute a read-only SQL query against the gym_data table.

    Returns a pandas DataFrame with the results, or an empty DataFrame
    on error.
    """
    _init_duckdb()

    try:
        result = _duckdb_conn.execute(query).fetchdf()
        log.info(f"[SQL_EXECUTOR] Query returned {len(result)} rows")
        return result
    except Exception as e:
        log.error(f"[SQL_EXECUTOR] SQL execution error: {e}")
        return pd.DataFrame()


def get_candidate_ids(df: pd.DataFrame) -> List[int]:
    """
    Extract the ID column from a DataFrame as a list of ints.

    Handles the case where the column might not exist or the DF is empty.
    """
    if df.empty:
        return []

    # Try common column names
    id_col = None
    for col_name in ["ID", "Id", "id"]:
        if col_name in df.columns:
            id_col = col_name
            break

    if id_col is None:
        log.warning("[SQL_EXECUTOR] No ID column found in result DataFrame")
        return []

    try:
        ids = df[id_col].dropna().astype(int).tolist()
        log.info(f"[SQL_EXECUTOR] Extracted {len(ids)} candidate IDs")
        return ids
    except Exception as e:
        log.error(f"[SQL_EXECUTOR] Error extracting IDs: {e}")
        return []


def get_dataframe() -> pd.DataFrame:
    """Return the cached DataFrame (useful for inspection)."""
    _init_duckdb()
    return _df
