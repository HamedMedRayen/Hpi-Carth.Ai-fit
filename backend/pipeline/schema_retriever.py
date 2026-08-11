"""
HPI RAG — Stage 1A: Schema Retriever
=====================================
Loads sql_schema_docs.yaml and formats it into a prompt-ready string
that the SQL generator can use as context.
"""

import logging
from pathlib import Path

import yaml

log = logging.getLogger("hpi.rag.schema_retriever")

_YAML_PATH = Path(__file__).parent.parent / "knowledge_base" / "sql_schema_docs.yaml"
_cached_context: str = None


def _load_yaml() -> dict:
    """Load the YAML schema file."""
    with open(_YAML_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_schema_context() -> str:
    """
    Load and format the schema YAML into a prompt-ready string.
    Cached after first call.
    """
    global _cached_context
    if _cached_context is not None:
        return _cached_context

    log.info(f"[SCHEMA] Loading schema from {_YAML_PATH}")
    schema = _load_yaml()

    lines = []
    lines.append(f"=== DATABASE SCHEMA ===")
    lines.append(f"Table: {schema['table_name']}")
    lines.append(f"Description: {schema['description'].strip()}")
    lines.append("")

    # Columns
    lines.append("Columns:")
    for col in schema["columns"]:
        name = col["name"]
        # Quote column names with spaces for SQL
        sql_name = f'"{name}"' if " " in name else name
        lines.append(f"  - {sql_name} ({col['type']}): {col['description'].strip()}")
    lines.append("")

    # Business rules
    lines.append("Business Rules:")
    for rule in schema["business_rules"]:
        lines.append(f"  - {rule}")
    lines.append("")

    # Example queries
    lines.append("Example Question → SQL pairs:")
    for ex in schema["example_queries"]:
        lines.append(f"  Q: {ex['question']}")
        lines.append(f"  Type: {ex['type']}")
        lines.append(f"  SQL: {ex['sql'].strip()}")
        lines.append("")

    lines.append("=== END SCHEMA ===")

    _cached_context = "\n".join(lines)
    log.info(f"[SCHEMA] Context built: {len(_cached_context)} chars")
    return _cached_context
