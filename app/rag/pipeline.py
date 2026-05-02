from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import re

import numpy as np
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

# Must match your existing collection name
COLLECTION = "pdf_chunks"
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_EMBEDDER = None

def get_embedder() -> SentenceTransformer:
    global _EMBEDDER
    if _EMBEDDER is None:
        print(f"Loading embedding model {EMBED_MODEL_NAME}...")
        _EMBEDDER = SentenceTransformer(EMBED_MODEL_NAME)
    return _EMBEDDER


def embed_texts(model: SentenceTransformer, texts: List[str]) -> np.ndarray:
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(vecs, dtype=np.float32)


def tokenize(text: str) -> List[str]:
    return re.findall(r"\w+", text.lower())


def retrieve(
    query: str,
    top_k: int = 6,
    only_filename: Optional[str] = None,
    qdrant_url: str = "http://localhost:6333",
) -> List[Dict[str, Any]]:
    client = QdrantClient(url=qdrant_url)
    embedder = get_embedder()

    qvec = embed_texts(embedder, [query])[0].tolist()

    qdrant_filter = None
    if only_filename:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        qdrant_filter = Filter(
            must=[FieldCondition(key="filename", match=MatchValue(value=only_filename))]
        )

    hits = client.search(
        collection_name=COLLECTION,
        query_vector=qvec,
        limit=top_k,
        with_payload=True,
        query_filter=qdrant_filter,
    )

    contexts: List[Dict[str, Any]] = []
    for h in hits:
        p = h.payload or {}
        contexts.append(
            {
                "id": str(h.id),
                "filename": p.get("filename", "unknown"),
                "page": p.get("page", None),
                "chunk_index": p.get("chunk_index", None),
                "text": p.get("text", ""),
                "score": float(h.score),
                "vector_score": float(h.score),
                "bm25_score": 0.0,
            }
        )

    return contexts


def scroll_all_payloads(
    client: QdrantClient,
    only_filename: Optional[str] = None,
    limit: int = 256,
) -> List[Dict[str, Any]]:
    qdrant_filter = None
    if only_filename:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        qdrant_filter = Filter(
            must=[FieldCondition(key="filename", match=MatchValue(value=only_filename))]
        )

    all_points: List[Dict[str, Any]] = []
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION,
            scroll_filter=qdrant_filter,
            limit=limit,
            with_payload=True,
            offset=offset,
        )
        for p in points:
            payload = p.payload or {}
            all_points.append(
                {
                    "id": str(p.id),
                    "filename": payload.get("filename", "unknown"),
                    "page": payload.get("page", None),
                    "chunk_index": payload.get("chunk_index", None),
                    "text": payload.get("text", ""),
                }
            )
        if offset is None:
            break

    return all_points


def bm25_search(
    query: str,
    top_k: int = 6,
    only_filename: Optional[str] = None,
    qdrant_url: str = "http://localhost:6333",
) -> List[Dict[str, Any]]:
    client = QdrantClient(url=qdrant_url)
    corpus = scroll_all_payloads(client, only_filename=only_filename)

    if not corpus:
        return []

    tokenized_corpus = [tokenize(c["text"]) for c in corpus]
    bm25 = BM25Okapi(tokenized_corpus)

    query_tokens = tokenize(query)
    scores = bm25.get_scores(query_tokens)

    top_indices = np.argsort(scores)[::-1][:top_k]

    contexts = []
    for idx in top_indices:
        c = corpus[int(idx)]
        contexts.append(
            {
                "id": c["id"],
                "filename": c["filename"],
                "page": c["page"],
                "chunk_index": c["chunk_index"],
                "text": c["text"],
                "score": float(scores[idx]),
                "vector_score": 0.0,
                "bm25_score": float(scores[idx]),
            }
        )

    return contexts


def normalize_score_map(score_map: Dict[str, float]) -> Dict[str, float]:
    if not score_map:
        return {}
    vals = list(score_map.values())
    min_s, max_s = min(vals), max(vals)
    if max_s == min_s:
        return {k: 1.0 for k in score_map}
    return {k: (v - min_s) / (max_s - min_s) for k, v in score_map.items()}


def hybrid_retrieve(
    query: str,
    top_k: int = 6,
    only_filename: Optional[str] = None,
    qdrant_url: str = "http://localhost:6333",
    vector_weight: float = 0.6,
    bm25_weight: float = 0.4,
) -> List[Dict[str, Any]]:
    vec_hits = retrieve(
        query=query,
        top_k=top_k,
        only_filename=only_filename,
        qdrant_url=qdrant_url,
    )
    bm25_hits = bm25_search(
        query=query,
        top_k=top_k,
        only_filename=only_filename,
        qdrant_url=qdrant_url,
    )

    vec_scores = {c["id"]: c["score"] for c in vec_hits}
    bm25_scores = {c["id"]: c["score"] for c in bm25_hits}

    vec_norm = normalize_score_map(vec_scores)
    bm25_norm = normalize_score_map(bm25_scores)

    context_map: Dict[str, Dict[str, Any]] = {}
    for c in bm25_hits:
        context_map[c["id"]] = c
    for c in vec_hits:
        context_map[c["id"]] = c

    combined: List[Dict[str, Any]] = []
    all_ids = set(vec_scores.keys()) | set(bm25_scores.keys())

    for cid in all_ids:
        v = vec_norm.get(cid, 0.0)
        b = bm25_norm.get(cid, 0.0)
        score = vector_weight * v + bm25_weight * b
        c = context_map[cid]
        c["score"] = score
        c["vector_score"] = vec_scores.get(cid, 0.0)
        c["bm25_score"] = bm25_scores.get(cid, 0.0)
        combined.append(c)

    combined.sort(key=lambda x: x["score"], reverse=True)
    return combined[:top_k]


def format_history(history: List[Dict[str, Any]]) -> str:
    if not history:
        return "None"
    lines = []
    for m in history:
        role = m.get("role", "user")
        content = m.get("content", "")
        lines.append(f"{role.upper()}: {content}")
    return "\n".join(lines)


def build_prompt(
    query: str,
    contexts: List[Dict[str, Any]],
    history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    context_blocks = []
    for c in contexts:
        page = c.get("page", "?")
        tag = f"[{c.get('filename','unknown')}:{page}]"
        context_blocks.append(f"{tag}\n{c.get('text','')}")

    context_text = "\n\n---\n\n".join(context_blocks)
    history_text = format_history(history or [])

    return f"""You are a helpful RAG assistant.

RULES:
- Use ONLY the provided context to answer.
- If the answer is not in the context, say: "I don't know based on the provided documents."
- Do NOT include citation brackets inside the answer text.
- Keep the answer concise and well-structured.
- The application will attach citations separately.

CONVERSATION HISTORY (most recent last):
{history_text}

QUESTION:
{query}

CONTEXT:
{context_text}

ANSWER:
"""


def generate(provider: str, model: str, prompt: str) -> str:
    provider = provider.lower().strip()

    if provider == "ollama":
        import ollama

        resp = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.2},
        )
        return resp["message"]["content"]

    if provider == "openai":
        from openai import OpenAI

        client = OpenAI()
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return resp.choices[0].message.content

    raise ValueError("provider must be 'ollama' or 'openai'")


def extract_citations(contexts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for c in contexts:
        key = (c.get("filename"), c.get("page"))
        if key in seen:
            continue
        seen.add(key)
        out.append({"filename": c.get("filename"), "page": c.get("page")})
    return out


def answer_question(
    query: str,
    provider: str = "ollama",
    model: str = "llama3",
    top_k: int = 6,
    only_filename: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    qdrant_url: str = "http://localhost:6333",
    hybrid: bool = True,
    vector_weight: float = 0.6,
    bm25_weight: float = 0.4,
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    if hybrid:
        contexts = hybrid_retrieve(
            query=query,
            top_k=top_k,
            only_filename=only_filename,
            qdrant_url=qdrant_url,
            vector_weight=vector_weight,
            bm25_weight=bm25_weight,
        )
    else:
        contexts = retrieve(
            query=query,
            top_k=top_k,
            only_filename=only_filename,
            qdrant_url=qdrant_url,
        )

    prompt = build_prompt(query, contexts, history=history)
    answer = generate(provider=provider, model=model, prompt=prompt)
    citations = extract_citations(contexts)
    return answer, citations, contexts