import os
import argparse
from typing import List, Dict, Any

import numpy as np
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer


COLLECTION = "pdf_chunks"
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_pdf_pages(pdf_path: str) -> List[Dict[str, Any]]:
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = " ".join(text.split())  # normalize whitespace
        if text.strip():
            pages.append({"page": i + 1, "text": text})
    return pages


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> List[str]:
    # simple char-based chunking (good enough to start)
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
        if start < 0:
            start = 0
        if start >= n:
            break
    return chunks


def ensure_collection(client: QdrantClient, vector_size: int):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def embed_texts(model: SentenceTransformer, texts: List[str]) -> np.ndarray:
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(vecs, dtype=np.float32)


def ingest(pdf_dir: str):
    client = QdrantClient(url="http://localhost:6333")
    embedder = SentenceTransformer(EMBED_MODEL_NAME)

    # create collection (vector size from model)
    test_vec = embedder.encode(["test"], normalize_embeddings=True)
    ensure_collection(client, vector_size=len(test_vec[0]))

    point_id = 1
    points = []

    for fname in os.listdir(pdf_dir):
        if not fname.lower().endswith(".pdf"):
            continue
        pdf_path = os.path.join(pdf_dir, fname)
        pages = load_pdf_pages(pdf_path)

        for p in pages:
            chunks = chunk_text(p["text"])
            if not chunks:
                continue

            vectors = embed_texts(embedder, chunks)
            for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
                payload = {
                    "filename": fname,
                    "page": p["page"],
                    "chunk_index": idx,
                    "text": chunk,
                }
                points.append(PointStruct(id=point_id, vector=vec.tolist(), payload=payload))
                point_id += 1

                # batch insert to avoid huge memory usage
                if len(points) >= 128:
                    client.upsert(collection_name=COLLECTION, points=points)
                    points = []

        print(f"Ingested: {fname}")

    if points:
        client.upsert(collection_name=COLLECTION, points=points)

    print("Done. Collection:", COLLECTION)


def build_prompt(query: str, contexts: List[Dict[str, Any]]) -> str:
    context_blocks = []
    for c in contexts:
        tag = f"[{c['filename']}:{c['page']}]"
        context_blocks.append(f"{tag}\n{c['text']}")

    context_text = "\n\n---\n\n".join(context_blocks)

    return f"""You are a helpful RAG assistant.

RULES:
- Use ONLY the provided context to answer.
- If the answer is not in the context, say: "I don't know based on the provided documents."
- Always include citations in the form [filename.pdf:page] for every important claim.

QUESTION:
{query}

CONTEXT:
{context_text}

ANSWER:
"""


def generate_with_openai(prompt: str, model: str):
    # Requires: setx OPENAI_API_KEY "..."
    from openai import OpenAI
    client = OpenAI()
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return resp.choices[0].message.content


def generate_with_ollama(prompt: str, model: str):
    # Requires Ollama running locally + model pulled (e.g., llama3)
    import ollama
    resp = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0.2},
    )
    return resp["message"]["content"]


def ask(query: str, provider: str, llm_model: str, top_k: int = 6):
    client = QdrantClient(url="http://localhost:6333")
    embedder = SentenceTransformer(EMBED_MODEL_NAME)

    qvec = embed_texts(embedder, [query])[0].tolist()

    hits = client.search(
        collection_name=COLLECTION,
        query_vector=qvec,
        limit=top_k,
        with_payload=True,
    )

    contexts = []
    for h in hits:
        p = h.payload or {}
        contexts.append(
            {
                "filename": p.get("filename", "unknown"),
                "page": p.get("page", "?"),
                "text": p.get("text", ""),
                "score": h.score,
            }
        )

    prompt = build_prompt(query, contexts)

    if provider == "openai":
        answer = generate_with_openai(prompt, llm_model)
    elif provider == "ollama":
        answer = generate_with_ollama(prompt, llm_model)
    else:
        raise ValueError("provider must be: openai or ollama")

    print("\n=== ANSWER ===\n")
    print(answer)

    print("\n=== TOP CONTEXTS ===\n")
    for c in contexts:
        print(f"- [{c['filename']}:{c['page']}] score={c['score']:.4f}")


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ingest = sub.add_parser("ingest")
    p_ingest.add_argument("--pdf_dir", default="data/pdfs")

    p_ask = sub.add_parser("ask")
    p_ask.add_argument("query")
    p_ask.add_argument("--provider", choices=["openai", "ollama"], default="ollama")
    p_ask.add_argument("--model", default="llama3")  # ollama default
    p_ask.add_argument("--top_k", type=int, default=6)

    args = parser.parse_args()

    if args.cmd == "ingest":
        ingest(args.pdf_dir)
    elif args.cmd == "ask":
        ask(args.query, args.provider, args.model, args.top_k)


if __name__ == "__main__":
    main()