"""Validate PDF uploads using extension, Content-Type, and %PDF magic bytes."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException, UploadFile

PDF_MAGIC = b"%PDF"
_ALLOWED_MIME = frozenset(
    {
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    }
)


def _normalize_mime(content_type: str | None) -> str:
    if not content_type:
        return ""
    return content_type.split(";")[0].strip().lower()


def _safe_filename(name: str) -> str:
    base = os.path.basename(name)
    if not base or base in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return base


async def validate_pdf_upload(file: UploadFile) -> str:
    """
    Ensure the upload is intended as PDF (extension + MIME) and starts with %PDF.
    Returns a basename-safe filename for storage.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file name is required")

    filename = _safe_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported (.pdf extension required)",
        )

    mime = _normalize_mime(file.content_type)
    if mime and mime not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Content-Type for a PDF upload: {file.content_type!r}. "
            "Expected application/pdf.",
        )

    head = await file.read(8)
    await file.seek(0)
    if not head.startswith(PDF_MAGIC):
        raise HTTPException(
            status_code=400,
            detail="File is not a valid PDF (missing %PDF header)",
        )

    return filename


def validate_pdf_path(pdf_path: Path) -> None:
    """Validate an on-disk file before ingest."""
    if pdf_path.suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files can be ingested (.pdf extension required)",
        )
    try:
        with pdf_path.open("rb") as f:
            head = f.read(8)
    except OSError as exc:
        raise HTTPException(
            status_code=400, detail=f"Cannot read file: {pdf_path.name}"
        ) from exc
    if not head.startswith(PDF_MAGIC):
        raise HTTPException(
            status_code=400,
            detail="File is not a valid PDF (missing %PDF header)",
        )
