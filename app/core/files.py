from pathlib import Path
from typing import Optional
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from app.rag.pipeline import COLLECTION, EMBED_MODEL_NAME, _embed_texts as embed_texts

BASE_DIR = Path(__file__).resolve().parents[2]
PDF_DIR = BASE_DIR / "data" / "pdfs"

def ensure_pdf_dir() -> Path:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    return PDF_DIR

def ingest_pdf_file(pdf_path: str, client: Optional[QdrantClient] = None) -> int:
    """
    Ingest one PDF file into Qdrant.
    Returns number of chunks inserted.
    """
    import os
    from pypdf import PdfReader
    from qdrant_client.models import Distance, VectorParams, PointStruct

    if client is None:
        client = QdrantClient(url="http://localhost:6333")

    embedder = SentenceTransformer(EMBED_MODEL_NAME)

    # Ensure collection exists
    test_vec = embedder.encode(["test"], normalize_embeddings=True)
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=len(test_vec[0]), distance=Distance.COSINE),
        )

    reader = PdfReader(pdf_path)
    points = []
    point_id_base = abs(hash(pdf_path)) % 1_000_000_000
    inserted = 0

    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = " ".join(text.split())
        if not text.strip():
            continue

        chunks = []
        start = 0
        chunk_size = 1200
        overlap = 200
        n = len(text)

        while start < n:
            end = min(start + chunk_size, n)
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Use the loop fix we applied to rag.py earlier to prevent infinite looping
            if end >= n:
                break
            start = max(end - overlap, start + 1)

        if not chunks:
            continue

        vectors = embed_texts(embedder, chunks)
        for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
            point_id = point_id_base + inserted + 1
            payload = {
                "filename": os.path.basename(pdf_path),
                "page": page_num,
                "chunk_index": idx,
                "text": chunk,
            }
            points.append(PointStruct(id=point_id, vector=vec.tolist(), payload=payload))
            inserted += 1

            if len(points) >= 128:
                client.upsert(collection_name=COLLECTION, points=points)
                points = []

    if points:
        client.upsert(collection_name=COLLECTION, points=points)

    return inserted