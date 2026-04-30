from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.rag.pipeline import answer_question

app = FastAPI(title="RAG Bot API", version="0.1.0")


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    provider: str = Field(default="ollama")  # "ollama" or "openai"
    model: str = Field(default="llama3")
    top_k: int = Field(default=6, ge=1, le=20)
    only_filename: Optional[str] = None
    debug: bool = False


class Citation(BaseModel):
    filename: str
    page: Optional[int] = None


class ContextChunk(BaseModel):
    filename: str
    page: Optional[int] = None
    chunk_index: Optional[int] = None
    score: float
    text: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    contexts: Optional[List[ContextChunk]] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    answer, citations, contexts = answer_question(
        query=req.query,
        provider=req.provider,
        model=req.model,
        top_k=req.top_k,
        only_filename=req.only_filename,
    )

    resp: Dict[str, Any] = {
        "answer": answer,
        "citations": citations,
    }
    if req.debug:
        resp["contexts"] = contexts
    return resp