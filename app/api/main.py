from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pathlib import Path
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from app.core.files import ensure_pdf_dir, ingest_pdf_file
from app.rag.pipeline import answer_question
from app.db.history import (
    create_conversation,
    add_message,
    get_messages,
    list_conversations,
    delete_conversation,
    ensure_db,
)

app = FastAPI(title="RAG Bot API", version="0.5.0")

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
    conversation_id: Optional[Union[str, int]] = None
    hybrid: bool = True
    vector_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    bm25_weight: float = Field(default=0.4, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def convert_id(self) -> "ChatRequest":
        if self.conversation_id is not None:
            self.conversation_id = str(self.conversation_id)
        return self


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
    conversation_id: str
    answer: str
    citations: List[Citation]
    contexts: Optional[List[ContextChunk]] = None


@app.on_event("startup")
def startup():
    ensure_db()


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=b"", media_type="image/x-icon")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def get_ui():
    index_path = Path(__file__).parent.parent / "web" / "index.html"
    return index_path.read_text()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/conversations")
def get_conversations():
    return {
        "conversations": list_conversations(),
    }


@app.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: str):
    return {
        "conversation_id": conversation_id,
        "messages": get_messages(conversation_id),
    }


@app.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: str):
    deleted = delete_conversation(int(conversation_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "deleted", "conversation_id": conversation_id}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Create or use existing conversation
    conversation_id = str(req.conversation_id or create_conversation("New Chat"))

    # Get prior history BEFORE saving current message
    history = get_messages(conversation_id)
    # Limit to last 6 messages
    history = history[-6:] if len(history) > 6 else history

    # Save user message
    add_message(conversation_id, "user", req.query)

    # Run RAG with history
    answer, citations, contexts = answer_question(
        query=req.query,
        provider=req.provider,
        model=req.model,
        top_k=req.top_k,
        only_filename=req.only_filename,
        history=history,
        hybrid=req.hybrid,
        vector_weight=req.vector_weight,
        bm25_weight=req.bm25_weight,
    )

    # Save assistant response
    add_message(conversation_id, "assistant", answer)

    resp: Dict[str, Any] = {
        "conversation_id": conversation_id,
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