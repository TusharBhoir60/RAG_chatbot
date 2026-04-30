from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# Must match your existing collection name used in rag.py
COLLECTION = "pdf_chunks"
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def embed_texts(model: SentenceTransformer, texts: List[str]) -> np.ndarray:
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(vecs, dtype=np.float32)


def retrieve(
    query: str,
    top_k: int = 6,
    only_filename: Optional[str] = None,
    qdrant_url: str = "http://localhost:6333",
) -> List[Dict[str, Any]]:
    client = QdrantClient(url=qdrant_url)
    embedder = SentenceTransformer(EMBED_MODEL_NAME)

    qvec = embed_texts(embedder, [query])[0].tolist()

    qdrant_filter = None
    if only_filename:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        qdrant_filter = Filter(
            must=[FieldCondition(key="filename", match=MatchValue(value=only_filename))]
        )

    hits = client.query_points(
        collection_name=COLLECTION,
        query=qvec,
        limit=top_k,
        with_payload=True,
        query_filter=qdrant_filter,
    ).points

    contexts: List[Dict[str, Any]] = []
    for h in hits:
        p = h.payload or {}
        contexts.append(
            {
                "filename": p.get("filename", "unknown"),
                "page": p.get("page", None),
                "chunk_index": p.get("chunk_index", None),
                "text": p.get("text", ""),
                "score": float(h.score),
            }
        )

    return contexts


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
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
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