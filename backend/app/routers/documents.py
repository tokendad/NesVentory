from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import logging
from pathlib import Path
from datetime import datetime
from .. import models, schemas
from ..deps import get_db
from ..storage import get_storage, extract_storage_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/items", tags=["documents"])

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
    storage_path = f"documents/{filename}"
    
    # Save file using storage backend
    storage = get_storage()
    try:
        file_url = storage.save(file.file, storage_path, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create document record
    document = models.Document(
        item_id=item_id,
        filename=file.filename or filename,
        path=file_url,
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
    
    # Extract the storage path from the document path
    storage = get_storage()
    storage_path = extract_storage_path(document.path, "documents")
    storage.delete(storage_path)
    
    db.delete(document)
    db.commit()
    return None
