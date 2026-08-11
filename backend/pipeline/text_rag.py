"""
HPI RAG — Stage 2: Text RAG (Qdrant Search + BGE Reranker)
============================================================
Embeds the user question using the same model that indexed Qdrant,
performs filtered semantic search, then reranks results with a
cross-encoder model.

Both models are lazy-loaded and cached at module level.
"""

import logging
from typing import Dict, List

from rag_config import (
    get_qdrant_client,
    QDRANT_COLLECTION,
    EMBEDDING_MODEL,
    RERANKER_MODEL,
    BGE_QUERY_PREFIX,
    TEXT_COLUMNS,
)

log = logging.getLogger("hpi.rag.text_rag")

# ── Lazy-loaded models (cached at module level) ───────────────
_embedding_model = None
_reranker_model = None


def _get_embedding_model():
    """Load the BGE embedding model on first use."""
    global _embedding_model
    if _embedding_model is None:
        log.info(f"[TEXT_RAG] Loading embedding model: {EMBEDDING_MODEL}")
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        log.info("[TEXT_RAG] Embedding model loaded")
    return _embedding_model


def _get_reranker_model():
    """Load the BGE reranker cross-encoder on first use."""
    global _reranker_model
    if _reranker_model is None:
        log.info(f"[TEXT_RAG] Loading reranker model: {RERANKER_MODEL}")
        from sentence_transformers import CrossEncoder
        _reranker_model = CrossEncoder(RERANKER_MODEL)
        log.info("[TEXT_RAG] Reranker model loaded")
    return _reranker_model


def search_and_rerank(
    question: str,
    candidate_ids: List[int],
    top_k_search: int = 20,
    top_k_final: int = 5,
) -> List[Dict]:
    """
    Perform filtered semantic search in Qdrant, then rerank with a
    cross-encoder.

    Parameters
    ----------
    question : The user's natural language question
    candidate_ids : List of member IDs from SQL stage to filter by
    top_k_search : Number of results to retrieve from Qdrant (pre-rerank)
    top_k_final : Number of results to return after reranking

    Returns
    -------
    List of dicts, each containing member ID, rerank_score, and
    payload fields (demographics + text columns).
    Returns empty list if no candidates or on error.
    """
    if not candidate_ids:
        log.warning("[TEXT_RAG] No candidate IDs provided, skipping search")
        return []

    try:
        # ── Step 1: Embed the question ─────────────────────────
        model = _get_embedding_model()

        # BGE requires query prefix for retrieval
        query_text = BGE_QUERY_PREFIX + question
        query_vector = model.encode(
            query_text,
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).tolist()

        # ── Step 2: Qdrant filtered search ─────────────────────
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        # Build filter: ID must be in candidate_ids
        # Qdrant's "match any" requires individual conditions with a "should" clause
        qdrant_filter = Filter(
            should=[
                FieldCondition(key="ID", match=MatchValue(value=cid))
                for cid in candidate_ids[:200]  # Cap to avoid huge filter
            ]
        )

        client = get_qdrant_client()
        # qdrant-client v1.18+: use query_points instead of deprecated search
        response = client.query_points(
            collection_name=QDRANT_COLLECTION,
            query=query_vector,
            query_filter=qdrant_filter,
            limit=top_k_search,
            with_payload=True,
        )
        search_results = response.points

        if not search_results:
            log.info("[TEXT_RAG] Qdrant returned no results")
            return []

        log.info(f"[TEXT_RAG] Qdrant returned {len(search_results)} results")

        # ── Step 3: Rerank with cross-encoder ──────────────────
        reranker = _get_reranker_model()

        # Build pairs for reranking: (question, document_text)
        pairs = []
        for hit in search_results:
            doc_text = hit.payload.get("embedded_text", "")
            pairs.append((question, doc_text))

        rerank_scores = reranker.predict(pairs)

        # Combine results with rerank scores
        scored_results = []
        for hit, score in zip(search_results, rerank_scores):
            payload = hit.payload
            result = {
                "ID": payload.get("ID"),
                "rerank_score": float(score),
                "qdrant_score": hit.score,
                # Demographics
                "Sex": payload.get("Sex"),
                "Age": payload.get("Age"),
                "Height": payload.get("Height"),
                "Weight": payload.get("Weight"),
                "BMI": payload.get("BMI"),
                "Level": payload.get("Level"),
                "Hypertension": payload.get("Hypertension"),
                "Diabetes": payload.get("Diabetes"),
                "Fitness Goal": payload.get("Fitness Goal"),
                "Fitness Type": payload.get("Fitness Type"),
            }
            # Add text columns
            for col in TEXT_COLUMNS:
                result[col] = payload.get(col, "")

            scored_results.append(result)

        # Sort by rerank score (descending) and take top_k_final
        scored_results.sort(key=lambda x: x["rerank_score"], reverse=True)
        top_results = scored_results[:top_k_final]

        log.info(
            f"[TEXT_RAG] Reranked → top {len(top_results)} results, "
            f"scores: {[round(r['rerank_score'], 4) for r in top_results]}"
        )

        return top_results

    except Exception as e:
        log.error(f"[TEXT_RAG] Search/rerank error: {e}", exc_info=True)
        return []
