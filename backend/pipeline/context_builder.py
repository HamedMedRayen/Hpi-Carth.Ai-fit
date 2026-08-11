"""
HPI RAG — Stage 3: Context Builder
====================================
Formats the retrieved member data into a clean context string that gets
injected into the existing HPI AI system prompt.
"""

import logging
from typing import Dict, List

from rag_config import TEXT_COLUMNS

log = logging.getLogger("hpi.rag.context_builder")


def build_retrieved_context(
    question: str,
    top_candidates: List[Dict],
) -> str:
    """
    Format retrieved member profiles into a context block for the LLM.

    Parameters
    ----------
    question : The original user question
    top_candidates : List of dicts from text_rag.search_and_rerank()

    Returns
    -------
    A formatted context string ready to be appended to the system prompt.
    Returns empty string if no candidates.
    """
    if not top_candidates:
        return ""

    lines = []
    lines.append("")
    lines.append("=== RELEVANT MEMBER DATA (from gym recommendation database) ===")
    lines.append(
        "Based on the user's question, here are profiles of members with "
        "similar characteristics. Use this data to ground your response "
        "with specific, evidence-based recommendations:"
    )
    lines.append("")

    for i, member in enumerate(top_candidates, 1):
        # Header line with demographics
        member_id = member.get("ID", "?")
        sex = member.get("Sex", "?")
        age = member.get("Age", "?")
        bmi = member.get("BMI", "?")
        level = member.get("Level", "?")
        goal = member.get("Fitness Goal", "?")
        fitness_type = member.get("Fitness Type", "?")
        hypertension = member.get("Hypertension", "?")
        diabetes = member.get("Diabetes", "?")
        height = member.get("Height", "?")
        weight = member.get("Weight", "?")

        lines.append(
            f"[Member {i} | ID={member_id}] "
            f"Sex: {sex} | Age: {age} | "
            f"Height: {height}m | Weight: {weight}kg | "
            f"BMI: {bmi} ({level}) | Goal: {goal} | Type: {fitness_type}"
        )

        # Health conditions if present
        conditions = []
        if hypertension == "Yes":
            conditions.append("Hypertension")
        if diabetes == "Yes":
            conditions.append("Diabetes")
        if conditions:
            lines.append(f"  Health: {', '.join(conditions)}")

        # Text columns
        for col in TEXT_COLUMNS:
            value = member.get(col, "")
            if value:
                # Truncate very long text to keep context reasonable
                display = str(value)
                if len(display) > 300:
                    display = display[:297] + "..."
                lines.append(f"  {col}: {display}")

        lines.append("")

    lines.append("================================================================")
    lines.append("")

    context = "\n".join(lines)
    log.info(
        f"[CONTEXT] Built context with {len(top_candidates)} members, "
        f"{len(context)} chars"
    )
    return context
