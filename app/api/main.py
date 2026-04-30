from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.files import ensure_pdf_dir, ingest_pdf_file
from app.rag.pipeline import answer_question

app = FastAPI(title="RAG Bot API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    provider: str = Field(default="ollama")
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


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_dir = ensure_pdf_dir()
    save_path = pdf_dir / file.filename

    with save_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "uploaded",
        "filename": file.filename,
        "saved_to": str(save_path),
    }


@app.post("/documents/{filename}/ingest")
def ingest_document(filename: str):
    pdf_dir = ensure_pdf_dir()
    pdf_path = pdf_dir / filename

    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    inserted = ingest_pdf_file(str(pdf_path))
    return {
        "message": "ingested",
        "filename": filename,
        "chunks_inserted": inserted,
    }
