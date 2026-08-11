"""
Embed gym_recommendation.xlsx rows using a BGE (BAAI General Embedding) model
and save the resulting vectors to disk.

Requirements (install once):
    pip install pandas openpyxl sentence-transformers numpy
    # For GPU: install a CUDA-enabled torch build instead of plain "torch", e.g.:
    pip install torch --index-url https://download.pytorch.org/whl/cu121

Usage:
    # Auto-detects GPU if available, else falls back to CPU
    python embed_gym_bge.py --input gym_recommendation.xlsx --output_dir ./vectors

    # Force GPU explicitly
    python embed_gym_bge.py --input gym_recommendation.xlsx --output_dir ./vectors --device cuda

    # Force a specific GPU / batch size
    python embed_gym_bge.py --input gym_recommendation.xlsx --output_dir ./vectors --device cuda:0 --batch_size 128

Output:
    vectors/embeddings.npy    -> float32 array, shape (n_rows, embedding_dim)
    vectors/metadata.csv      -> original row data + the exact text that was embedded
    vectors/ids.npy           -> row IDs, in the same order as embeddings.npy
"""

import argparse
import os
import time

import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer

# BGE model choices (pick one based on speed/quality tradeoff):
#   "BAAI/bge-small-en-v1.5"  -> 384 dim,  fast, good baseline
#   "BAAI/bge-base-en-v1.5"   -> 768 dim,  balanced
#   "BAAI/bge-large-en-v1.5"  -> 1024 dim, best quality, slower (default here)
MODEL_NAME = "BAAI/bge-large-en-v1.5"

# BGE's own docs recommend prefixing *queries* (not documents/passages) with
# this instruction when doing retrieval. We are embedding documents (rows),
# so no prefix is added to the text we build below.
QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


def row_to_text(row: pd.Series) -> str:
    """Turn one spreadsheet row into a single natural-language string to embed."""
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="gym_recommendation.xlsx", help="Path to the xlsx file")
    parser.add_argument("--output_dir", default="./vectors", help="Directory to write output files")
    parser.add_argument("--model", default=MODEL_NAME, help="BGE model name on HuggingFace")
    parser.add_argument("--batch_size", type=int, default=64)
    parser.add_argument(
        "--device",
        default=None,
        help="cuda, cuda:0, cpu, etc. If omitted, auto-detects GPU and falls back to CPU.",
    )
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    # --- Device selection ---
    if args.device:
        device = args.device
    else:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    if device.startswith("cuda"):
        if not torch.cuda.is_available():
            raise RuntimeError(
                "CUDA was requested but torch.cuda.is_available() is False. "
                "Install a CUDA-enabled torch build, e.g.:\n"
                "  pip uninstall torch -y\n"
                "  pip install torch --index-url https://download.pytorch.org/whl/cu121"
            )
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("Using CPU (no GPU detected or requested).")

    print(f"Loading spreadsheet: {args.input}")
    df = pd.read_excel(args.input)
    print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")

    print("Building text representation for each row...")
    texts = df.apply(row_to_text, axis=1).tolist()

    print(f"Loading BGE model: {args.model} (this downloads weights on first run)")
    model = SentenceTransformer(args.model, device=device)

    print(f"Embedding {len(texts)} rows in batches of {args.batch_size} on {device}...")
    start = time.time()
    embeddings = model.encode(
        texts,
        batch_size=args.batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,  # BGE embeddings should be L2-normalized for cosine similarity
        convert_to_numpy=True,
    ).astype(np.float32)
    elapsed = time.time() - start

    print(f"Embeddings shape: {embeddings.shape}")
    print(f"Embedding took {elapsed:.1f}s ({len(texts) / elapsed:.1f} rows/sec)")

    emb_path = os.path.join(args.output_dir, "embeddings.npy")
    ids_path = os.path.join(args.output_dir, "ids.npy")
    meta_path = os.path.join(args.output_dir, "metadata.csv")

    np.save(emb_path, embeddings)
    np.save(ids_path, df["ID"].to_numpy())

    meta_df = df.copy()
    meta_df["embedded_text"] = texts
    meta_df.to_csv(meta_path, index=False)

    print("Done.")
    print(f"  Embeddings: {emb_path}")
    print(f"  IDs:        {ids_path}")
    print(f"  Metadata:   {meta_path}")


if __name__ == "__main__":
    main()