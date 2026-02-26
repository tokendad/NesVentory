"""Shared upload helpers: size-limiting file reads and response sanitization."""

import io
from typing import Optional
from fastapi import HTTPException, UploadFile

MAX_IMAGE_BYTES = 10 * 1024 * 1024     # 10 MB — AI image uploads
MAX_PHOTO_BYTES = 25 * 1024 * 1024     # 25 MB — user photo uploads
MAX_DOCUMENT_BYTES = 50 * 1024 * 1024  # 50 MB — documents / CSV / XLSX
MAX_VIDEO_BYTES = 100 * 1024 * 1024    # 100 MB — video uploads


async def read_limited(file: UploadFile, max_bytes: int) -> bytes:
    """Read an uploaded file with a hard size cap to prevent memory exhaustion.

    Raises HTTP 413 if the upload exceeds *max_bytes*.
    """
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File exceeds {mb} MB limit.")
    return data


def sanitize_raw_response(text: Optional[str], max_length: int = 500) -> str:
    """Truncate and sanitize raw AI response text for client consumption."""
    if not text:
        return ""
    if len(text) > max_length:
        return text[:max_length] + "... [truncated]"
    return text


def bytes_to_stream(data: bytes) -> io.BytesIO:
    """Wrap bytes in a seekable BytesIO stream for use with storage backends."""
    return io.BytesIO(data)
