from __future__ import annotations

import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi import FastAPI, File, HTTPException, UploadFile, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, Request
from pydantic import BaseModel, Field, field_validator
import json
from starlette.concurrency import run_in_threadpool

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.files import ensure_pdf_dir, ingest_pdf_file
from app.core.pdf_validation import validate_pdf_upload
from app.db.history import (
    add_message,
    create_conversation,
    delete_conversation,
    ensure_db,
    get_messages,
    list_conversations,
    update_conversation_title,
    increment_user_queries,
)
from app.logging_config import setup_logging
from app.rag.exceptions import OllamaServiceError, RetrievalServiceError
from app.rag.pipeline import answer_question_stream

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="RAG Bot API", version="0.5.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api/v1")

_CONV_ID_RE = re.compile(r"^[1-9][0-9]*$")

# Browsers disallow allow_origins=["*"] together with allow_credentials=True.
# List explicit dev origins instead (add production URLs when deploying).
_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEV_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    # In a real setup, verify JWT with pyjwt: jwt.decode(token, SECRET, algorithms=["HS256"])
    # NextAuth passes the user.id as the Bearer token in our current setup for simplicity.
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unexpected errors; avoid leaking internals in the response body."""
    logger.error(
        "Unhandled error %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=100_000)
    provider: Literal["ollama", "openai"] = "ollama"
    model: str = Field(default="llama3:latest", min_length=1, max_length=128)
    top_k: int = Field(default=6, ge=1, le=20)
    only_filename: Optional[str] = None
    debug: bool = False
    conversation_id: Optional[str] = None
    hybrid: bool = True
    vector_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    bm25_weight: float = Field(default=0.4, ge=0.0, le=1.0)

    @field_validator("conversation_id", mode="before")
    @classmethod
    def validate_conversation_id(cls, v: Any) -> Optional[str]:
        """SQLite conversation primary key: positive integer string (not a UUID)."""
        if v is None:
            return None
        if isinstance(v, bool):
            raise ValueError("conversation_id must be a positive integer")
        if isinstance(v, int):
            if v <= 0:
                raise ValueError("conversation_id must be a positive integer")
            return str(v)
        s = str(v).strip()
        if not _CONV_ID_RE.fullmatch(s):
            raise ValueError(
                "conversation_id must be a positive integer string matching the "
                "SQLite conversation id"
            )
        return s

    @field_validator("only_filename")
    @classmethod
    def only_filename_basename(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        base = os.path.basename(s)
        if base != s or "/" in s or "\\" in s:
            raise ValueError("only_filename must be a base file name, not a path")
        return base


class Citation(BaseModel):
    filename: str
    page: Optional[int] = None


class ContextChunk(BaseModel):
    filename: str
    page: Optional[int] = None
    chunk_index: Optional[int] = None
    score: float
    rerank_score: Optional[float] = None
    text: str


class ChatResponse(BaseModel):
    """Stable contract for the Next.js client (field order preserved for readability)."""

    answer: str
    citations: List[Citation]
    contexts: List[ContextChunk]
    conversation_id: str


def _sse_data(payload: Dict[str, Any]) -> str:
    """SSE frame matching the frontend contract (data: JSON)."""
    return f"data: {json.dumps(payload)}\n\n"


def _sse_error(message: str) -> str:
    return _sse_data({"type": "error", "content": message})


def _persist_and_ingest_pdf(contents: bytes, save_path: Path, user_id: str) -> int:
    """Blocking save + Qdrant ingest (run via threadpool from async routes)."""
    with save_path.open("wb") as buffer:
        buffer.write(contents)
    num_chunks = ingest_pdf_file(str(save_path), user_id=user_id, client=None)
    from app.rag.pipeline import build_bm25_cache

    build_bm25_cache()
    return num_chunks


def _title_from_query(query: str) -> str:
    text = " ".join(query.strip().split())
    if not text:
        return "New Chat"
    words = text.split(" ")
    title = " ".join(words[:8])
    if len(words) > 8:
        title = f"{title}..."
    if len(title) > 80:
        title = f"{title[:77].rstrip()}..."
    return title


def _raw_contexts_to_chunks(raw: List[Dict[str, Any]]) -> List[ContextChunk]:
    """Strip extra retrieval fields so response matches ContextChunk exactly."""
    out: List[ContextChunk] = []
    for c in raw:
        out.append(
            ContextChunk(
                filename=str(c.get("filename") or "unknown"),
                page=c.get("page"),
                chunk_index=c.get("chunk_index"),
                score=float(c.get("score") or 0.0),
                rerank_score=c.get("rerank_score"),
                text=str(c.get("text") or ""),
            )
        )
    return out


class HistoryMessage(BaseModel):
    """One row of chat history for the UI (user vs assistant bubbles)."""

    role: str
    content: str
    created_at: Optional[str] = None


class ConversationMessagesResponse(BaseModel):
    conversation_id: str
    messages: List[HistoryMessage]


class DocumentUploadResponse(BaseModel):
    message: str
    filename: str
    saved_to: str


@app.on_event("startup")
def startup():
    logger.info("application startup")
    ensure_db()

    # Pre-load embedding model on startup
    from app.rag.pipeline import get_embedder, build_bm25_cache

    get_embedder()
    build_bm25_cache()


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=b"", media_type="image/x-icon")


@app.get("/", include_in_schema=False)
async def serve_ui():
    # Calculate the path to app/web/index.html relative to this file
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, "web", "index.html")
    return FileResponse(file_path)


@app.get("/health")
@app.get("/healthz")
def health():
    return {"status": "ok"}


@api_router.get("/conversations")
def get_conversations(user_id: str = Depends(get_current_user)):
    rows = list_conversations(user_id)
    logger.info("list_conversations count=%s user_id=%s", len(rows), user_id)
    return {"conversations": rows}

@api_router.get("/stats")
def get_stats(user_id: str = Depends(get_current_user)):
    # Calculate storage used by PDFs
    pdf_dir = ensure_pdf_dir()
    total_size_bytes = sum(f.stat().st_size for f in pdf_dir.glob("*.pdf") if f.is_file())
    storage_used_gb = total_size_bytes / (1024 ** 3)
    
    # Calculate approximate tokens used (very rough estimate: words * 1.3)
    # We'll just fetch all conversations and their messages, or a dummy for now
    # Since we can't fetch all messages easily without a new DB query, let's just 
    # estimate based on message count across all conversations.
    conversations = list_conversations(user_id)
    total_messages = sum(conv["message_count"] for conv in conversations)
    
    # Let's say average message is 150 tokens.
    tokens_used = total_messages * 150
    
    return {
        "storage_used_gb": round(storage_used_gb, 4),
        "storage_total_gb": 10.0,
        "tokens_used": tokens_used,
        "tokens_total": 100000
    }


@api_router.get(
    "/conversations/{conversation_id}/messages",
    response_model=ConversationMessagesResponse,
)
def list_messages(conversation_id: str, user_id: str = Depends(get_current_user)):
    try:
        conv_int = int(conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid conversation_id") from exc
    if conv_int <= 0:
        raise HTTPException(status_code=422, detail="Invalid conversation_id")
    rows = get_messages(conv_int, user_id)
    logger.info(
        "list_messages conversation_id=%s user_id=%s message_count=%s", conv_int, user_id, len(rows)
    )
    return ConversationMessagesResponse(
        conversation_id=str(conv_int),
        messages=[HistoryMessage(**row) for row in rows],
    )


@api_router.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: str, user_id: str = Depends(get_current_user)):
    try:
        cid = int(conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid conversation_id") from exc
    if cid <= 0:
        raise HTTPException(status_code=422, detail="Invalid conversation_id")
    deleted = delete_conversation(cid, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found or unauthorized")
    return {"message": "deleted", "conversation_id": conversation_id}


@api_router.delete("/conversations")
def clear_all_conversations(user_id: str = Depends(get_current_user)):
    # Helper to just loop and delete
    conversations = list_conversations(user_id)
    deleted_count = 0
    for conv in conversations:
        if delete_conversation(conv["id"], user_id):
            deleted_count += 1
    return {"message": "deleted_all", "deleted_count": deleted_count}


@api_router.post("/chat")
@limiter.limit("20/minute")
def chat(request: Request, req: ChatRequest, user_id: str = Depends(get_current_user)):
    increment_user_queries(user_id)
    preview = req.query[:200] + ("…" if len(req.query) > 200 else "")
    logger.info(
        "chat request conversation_id=%s provider=%s model=%s top_k=%s debug=%s "
        "query_len=%s query_preview=%r",
        req.conversation_id,
        req.provider,
        req.model,
        req.top_k,
        req.debug,
        len(req.query),
        preview,
    )

    # Create or use existing conversation (DB uses integer PK; expose string to clients)
    if req.conversation_id is not None:
        conv_int = int(req.conversation_id)
        is_new_conversation = False
    else:
        conv_int = create_conversation(user_id, "New Chat")
        is_new_conversation = True
    conversation_id = str(conv_int)

    # Get prior history BEFORE saving current message, limited to last 6
    history = get_messages(conv_int, user_id, limit=6)

    # Save user message
    add_message(conv_int, user_id, "user", req.query)

    if is_new_conversation:
        update_conversation_title(conv_int, user_id, _title_from_query(req.query))

    def event_stream():
        full_answer: List[str] = []
        stream_failed = False
        citation_models: List[Citation] = []
        chunk_models: List[ContextChunk] = []

        try:
            try:
                generator, citations, contexts = answer_question_stream(
                    query=req.query,
                    provider=req.provider,
                    model=req.model,
                    top_k=req.top_k,
                    only_filename=req.only_filename,
                    history=history,
                    hybrid=req.hybrid,
                    vector_weight=req.vector_weight,
                    bm25_weight=req.bm25_weight,
                    user_id=user_id,
                )
            except OllamaServiceError as exc:
                logger.warning("chat failed: Ollama unavailable — %s", exc)
                stream_failed = True
                yield _sse_error(str(exc))
                return
            except RetrievalServiceError as exc:
                logger.warning("chat failed: retrieval unavailable — %s", exc)
                stream_failed = True
                yield _sse_error(str(exc))
                return

            citation_models = [Citation(**c) for c in citations]
            chunk_models = _raw_contexts_to_chunks(contexts) if req.debug else []

            meta_data = {
                "type": "meta",
                "conversation_id": conversation_id,
                "citations": [c.model_dump() for c in citation_models],
                "contexts": [c.model_dump() for c in chunk_models],
            }
            yield _sse_data(meta_data)

            try:
                for token in generator:
                    full_answer.append(token)
                    yield _sse_data({"type": "token", "content": token})
            except OllamaServiceError as exc:
                logger.warning("chat failed during generation — %s", exc)
                stream_failed = True
                yield _sse_error(str(exc))
            except RetrievalServiceError as exc:
                logger.warning("chat failed during generation — %s", exc)
                stream_failed = True
                yield _sse_error(str(exc))
            except Exception as exc:
                logger.exception("Error during token generation")
                stream_failed = True
                yield _sse_error(f"Generation failed: {exc}")

        except Exception as exc:
            logger.exception("chat stream failed")
            stream_failed = True
            yield _sse_error(f"Stream failed: {exc}")

        finally:
            answer_text = "".join(full_answer)
            if answer_text:
                add_message(conv_int, user_id, "assistant", answer_text)

            if stream_failed:
                logger.warning(
                    "chat stream ended with error conversation_id=%s answer_len=%s",
                    conversation_id,
                    len(answer_text),
                )
            else:
                logger.info(
                    "chat completed conversation_id=%s citations=%s contexts_logged=%s answer_len=%s",
                    conversation_id,
                    len(citation_models),
                    len(chunk_models),
                    len(answer_text),
                )
                yield _sse_data({"type": "done"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


class TitleUpdateRequest(BaseModel):
    title: str

@api_router.patch("/conversations/{conversation_id}/title")
def rename_conversation(conversation_id: str, req: TitleUpdateRequest, user_id: str = Depends(get_current_user)):
    try:
        cid = int(conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid conversation_id") from exc
    if cid <= 0:
        raise HTTPException(status_code=422, detail="Invalid conversation_id")
    updated = update_conversation_title(cid, user_id, req.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found or unauthorized")
    return {"message": "updated", "conversation_id": conversation_id, "title": req.title}


@api_router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...), user_id: str = Depends(get_current_user)
):
    filename = await validate_pdf_upload(file)
    contents = await file.read()

    pdf_dir = ensure_pdf_dir()
    save_path = pdf_dir / filename

    try:
        num_chunks = await run_in_threadpool(
            _persist_and_ingest_pdf, contents, save_path, user_id
        )
    except Exception as exc:
        logger.exception(
            "document upload/ingest failed filename=%s user_id=%s",
            filename,
            user_id,
        )
        if save_path.exists():
            try:
                save_path.unlink()
            except OSError:
                logger.warning("could not remove partial upload %s", save_path)
        raise HTTPException(
            status_code=503,
            detail=(
                "Document upload or ingest failed. Ensure Qdrant is running, "
                "the embedding model is available, and the PDF is not corrupted."
            ),
        ) from exc

    logger.info(
        "document uploaded and ingested filename=%s saved_to=%s user_id=%s chunks=%s",
        filename,
        save_path,
        user_id,
        num_chunks,
    )

    return DocumentUploadResponse(
        message="uploaded",
        filename=filename,
        saved_to=str(save_path),
    )


app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.main:app", host="127.0.0.1", port=8000, reload=True)

