from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import shutil
import logging
from pathlib import Path
from datetime import datetime
from .. import models, schemas
from ..deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/items", tags=["documents"])

# Directory to store uploaded documents
# Media files are stored in /app/data/media to ensure they persist with the database
UPLOAD_DIR = Path("/app/data/media/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types for document uploads (PDF and TXT)
ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain"]

# Map MIME types to safe extensions
MIME_TYPE_EXTENSION = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
}


@router.post("/{item_id}/documents", response_model=schemas.Document, status_code=status.HTTP_201_CREATED)
async def upload_document(
    item_id: UUID,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a document (PDF or TXT) for an item."""
    # Verify item exists
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: PDF, TXT"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_extension = MIME_TYPE_EXTENSION.get(file.content_type, ".pdf")
    # Use original filename as base, with timestamp for uniqueness
    original_name = Path(file.filename).stem if file.filename else "document"
    # Sanitize the original name to avoid path traversal - only allow alphanumeric, underscore, and hyphen
    safe_name = "".join(c for c in original_name if c.isalnum() or c in ('_', '-'))[:100]
    if not safe_name:
        safe_name = "document"
    filename = f"{item_id}_{timestamp}_{safe_name}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Validate that file_path is inside UPLOAD_DIR after normalization
    abs_upload_dir = UPLOAD_DIR.resolve()
    abs_file_path = file_path.resolve()
    if not str(abs_file_path).startswith(str(abs_upload_dir)):
        raise HTTPException(status_code=400, detail="Unsafe file path.")
    
    # Save file
    try:
        with abs_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create document record
    document = models.Document(
        item_id=item_id,
        filename=file.filename or filename,
        path=f"/uploads/documents/{filename}",
        mime_type=file.content_type,
        document_type=document_type
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document


@router.delete("/{item_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    item_id: UUID,
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a document."""
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.item_id == item_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from filesystem
    # Extract filename from the path (stored as /uploads/documents/filename)
    # Use PurePosixPath to handle the stored path which uses forward slashes
    from pathlib import PurePosixPath
    stored_filename = PurePosixPath(document.path).name
    file_path = UPLOAD_DIR / stored_filename
    
    # Validate file path is within UPLOAD_DIR to prevent path traversal
    abs_upload_dir = UPLOAD_DIR.resolve()
    abs_file_path = file_path.resolve()
    if str(abs_file_path).startswith(str(abs_upload_dir)) and file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete file {file_path}: {e}")
    
    db.delete(document)
    db.commit()
    return None
