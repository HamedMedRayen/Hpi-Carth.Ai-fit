"""
HPI RAG — Retrieval Pipeline Orchestrator
===========================================
Wires together all stages (1A → 1B → 1C → 1D → 2 → 3) into a single
function call. Logs intermediate outputs for debugging. Fails gracefully
so HPI AI can always respond, even without grounded data.
"""

import logging
import time

log = logging.getLogger("hpi.rag.pipeline")


def get_context_for_question(question: str) -> str:
    """
    Run the full RAG retrieval pipeline and return a context string.

    Stages:
        1A. Load schema context (YAML)
        1B. Classify the question type
        1C. Generate SQL from question + schema + type
        1D. Execute SQL to get candidate member IDs
        2.  Qdrant semantic search + reranking (filtered to candidates)
        3.  Format retrieved data into a context block

    Parameters
    ----------
    question : The user's natural language question

    Returns
    -------
    A formatted context string to inject into the system prompt.
    Returns empty string if any stage fails or no data found.
    """
    if not question or not question.strip():
        return ""

    start_time = time.time()
    log.info(f"[PIPELINE] Starting retrieval for: '{question[:80]}...'")

    try:
        # ── Stage 1A: Schema Context ──────────────────────────
        from pipeline.schema_retriever import get_schema_context

        schema_context = get_schema_context()
        log.info(f"[PIPELINE] 1A Schema: {len(schema_context)} chars")

        # ── Stage 1B: Classify Question ───────────────────────
        from pipeline.question_classifier import classify_question

        question_type = classify_question(question)
        log.info(f"[PIPELINE] 1B Classification: {question_type.value}")

        # ── Stage 1C: Generate SQL ────────────────────────────
        from pipeline.sql_generator import generate_sql

        sql_query = generate_sql(question, schema_context, question_type.value)
        log.info(f"[PIPELINE] 1C SQL: {sql_query[:120]}...")

        # ── Stage 1D: Execute SQL ─────────────────────────────
        from pipeline.sql_executor import execute_sql, get_candidate_ids

        result_df = execute_sql(sql_query)
        candidate_ids = get_candidate_ids(result_df)
        log.info(
            f"[PIPELINE] 1D Execution: {len(result_df)} rows, "
            f"{len(candidate_ids)} candidate IDs"
        )

        if not candidate_ids:
            elapsed = time.time() - start_time
            log.warning(
                f"[PIPELINE] No candidates from SQL, returning empty context "
                f"({elapsed:.2f}s)"
            )
            return ""

        # ── Stage 2: Qdrant Search + Rerank ───────────────────
        from pipeline.text_rag import search_and_rerank

        top_candidates = search_and_rerank(
            question=question,
            candidate_ids=candidate_ids,
            top_k_search=20,
            top_k_final=5,
        )
        log.info(
            f"[PIPELINE] Stage 2: {len(top_candidates)} reranked results"
        )

        if not top_candidates:
            elapsed = time.time() - start_time
            log.warning(
                f"[PIPELINE] No results from Qdrant/rerank, returning empty "
                f"context ({elapsed:.2f}s)"
            )
            return ""

        # ── Stage 3: Build Context ────────────────────────────
        from pipeline.context_builder import build_retrieved_context

        context = build_retrieved_context(question, top_candidates)
        elapsed = time.time() - start_time
        log.info(
            f"[PIPELINE] Complete: {len(context)} chars context in "
            f"{elapsed:.2f}s"
        )

        return context

    except Exception as e:
        elapsed = time.time() - start_time
        log.error(
            f"[PIPELINE] Fatal error in retrieval pipeline ({elapsed:.2f}s): {e}",
            exc_info=True,
        )
        return ""
