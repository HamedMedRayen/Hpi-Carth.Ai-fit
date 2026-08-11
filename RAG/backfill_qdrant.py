"""
Backfill missing rows into Qdrant collection `hpi_vectors`.
============================================================
Finds all IDs in gym_recommendation.xlsx that are NOT already in Qdrant,
embeds them with BAAI/bge-large-en-v1.5 using the same text construction
logic as embed_gym_bge.py, and uploads them.

Usage:
    python backfill_qdrant.py
"""

import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

# Ensure backend dir is on path for rag_config
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

# ── Config ─────────────────────────────────────────────────────
EXCEL_PATH = str(Path(__file__).parent / "gym_recommendation.xlsx")
COLLECTION_NAME = "hpi_vectors"

# Qdrant credentials (same as .env)
from dotenv import load_dotenv
_ROOT = Path(__file__).parent.parent
load_dotenv(_ROOT / ".env", override=False)
load_dotenv(_ROOT / "backend" / ".env", override=True)

QDRANT_URL = os.getenv("CLUSTER_ENDPOINT", "")
QDRANT_API_KEY = os.getenv("CLUSTER_API", "")

MODEL_NAME = "BAAI/bge-large-en-v1.5"


def row_to_text(row: pd.Series) -> str:
    """Same text construction as embed_gym_bge.py — must match exactly."""
    parts = [
        f"Sex: {row['Sex']}",
        f"Age: {row['Age']}",
        f"Height: {row['Height']} m",
        f"Weight: {row['Weight']} kg",
        f"BMI: {row['BMI']} ({row['Level']})",
        f"Hypertension: {row['Hypertension']}",
        f"Diabetes: {row['Diabetes']}",
        f"Fitness Goal: {row['Fitness Goal']}",
        f"Fitness Type: {row['Fitness Type']}",
        f"Exercises: {row['Exercises']}",
        f"Equipment: {row['Equipment']}",
        f"Diet: {row['Diet']}",
        f"Recommendation: {row['Recommendation']}",
    ]
    return " | ".join(str(p) for p in parts)


def main():
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct

    print(f"Connecting to Qdrant: {QDRANT_URL[:50]}...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    # Get current collection info
    info = client.get_collection(COLLECTION_NAME)
    current_count = info.points_count
    print(f"Current points in '{COLLECTION_NAME}': {current_count}")

    # Load the full Excel
    print(f"Loading Excel: {EXCEL_PATH}")
    df = pd.read_excel(EXCEL_PATH)
    total_rows = len(df)
    print(f"Total rows in Excel: {total_rows}")

    # Find which IDs are already in Qdrant by scrolling through all points
    print("Scanning existing point IDs in Qdrant...")
    existing_ids = set()
    offset = None
    while True:
        results, next_offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=1000,
            offset=offset,
            with_payload=False,
            with_vectors=False,
        )
        for point in results:
            existing_ids.add(int(point.id))
        if next_offset is None:
            break
        offset = next_offset
    print(f"Found {len(existing_ids)} existing point IDs")

    # Filter to missing rows
    all_ids = set(df["ID"].tolist())
    missing_ids = all_ids - existing_ids
    print(f"Missing IDs to backfill: {len(missing_ids)}")

    if not missing_ids:
        print("Nothing to backfill — all rows already in Qdrant!")
        return

    missing_df = df[df["ID"].isin(missing_ids)].copy()
    print(f"Rows to embed and upload: {len(missing_df)}")

    # Build text representations
    print("Building text representations...")
    texts = missing_df.apply(row_to_text, axis=1).tolist()
    missing_df["embedded_text"] = texts

    # Load embedding model
    import torch
    from sentence_transformers import SentenceTransformer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading {MODEL_NAME} on {device}...")
    model = SentenceTransformer(MODEL_NAME, device=device)

    # Embed
    print(f"Embedding {len(texts)} rows...")
    start = time.time()
    embeddings = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)
    elapsed = time.time() - start
    print(f"Embedding done in {elapsed:.1f}s ({len(texts)/elapsed:.1f} rows/sec)")
    print(f"Embeddings shape: {embeddings.shape}")

    # Build Qdrant points
    print("Building Qdrant points...")
    points = []
    payload_columns = [c for c in df.columns]  # all original columns
    for idx, (_, row) in enumerate(missing_df.iterrows()):
        payload = {col: row[col] for col in payload_columns}
        # Add embedded_text to payload (matches original upload)
        payload["embedded_text"] = texts[idx]
        # Convert numpy types to Python native for JSON serialization
        for k, v in payload.items():
            if hasattr(v, "item"):
                payload[k] = v.item()

        points.append(
            PointStruct(
                id=int(row["ID"]),
                vector=embeddings[idx].tolist(),
                payload=payload,
            )
        )

    # Upload in batches of 100
    BATCH_SIZE = 100
    total_batches = (len(points) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"Uploading {len(points)} points in {total_batches} batches...")
    for i in range(0, len(points), BATCH_SIZE):
        batch = points[i : i + BATCH_SIZE]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)
        batch_num = i // BATCH_SIZE + 1
        print(f"  Batch {batch_num}/{total_batches} uploaded ({len(batch)} points)")

    # Verify final count
    final_info = client.get_collection(COLLECTION_NAME)
    final_count = final_info.points_count
    print(f"\n{'='*50}")
    print(f"Backfill complete!")
    print(f"  Before: {current_count} points")
    print(f"  Added:  {len(points)} points")
    print(f"  After:  {final_count} points")
    print(f"  Expected: {total_rows}")
    if final_count == total_rows:
        print("  ✓ All rows are now in Qdrant!")
    else:
        print(f"  ⚠ Mismatch: expected {total_rows}, got {final_count}")


if __name__ == "__main__":
    main()
