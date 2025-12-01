from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging
from pathlib import Path
from datetime import datetime
from .. import models, schemas
from ..deps import get_db
from ..storage import get_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/items", tags=["photos"])

# Allowed file types for photo uploads
ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

# Map MIME types to safe extensions
MIME_TYPE_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

@router.post("/{item_id}/photos", response_model=schemas.Photo, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    item_id: UUID,
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    is_data_tag: bool = Form(False),
    photo_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a photo for an item."""
    # Verify item exists
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_PHOTO_TYPES)}"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_extension = MIME_TYPE_EXTENSION.get(file.content_type, ".jpg")
    filename = f"{item_id}_{timestamp}{file_extension}"
    storage_path = f"photos/{filename}"
    
    # Save file using storage backend
    storage = get_storage()
    try:
        file_url = storage.save(file.file, storage_path, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # If this is set as primary, unset other primary photos for this item
    if is_primary:
        db.query(models.Photo).filter(
            models.Photo.item_id == item_id,
            models.Photo.is_primary == True
        ).update({"is_primary": False})
    
    # If this is set as data tag, unset other data tag photos for this item
    if is_data_tag:
        db.query(models.Photo).filter(
            models.Photo.item_id == item_id,
            models.Photo.is_data_tag == True
        ).update({"is_data_tag": False})
    
    # Create photo record
    photo = models.Photo(
        item_id=item_id,
        path=file_url,
        mime_type=file.content_type,
        is_primary=is_primary,
        is_data_tag=is_data_tag,
        photo_type=photo_type
    )
    
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    return photo


@router.delete("/{item_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    item_id: UUID,
    photo_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a photo."""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.item_id == item_id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Extract the storage path from the photo path
    # The path is stored as a URL (e.g., "/uploads/photos/filename" or S3 URL)
    storage = get_storage()
    
    # For local storage, extract the relative path
    # For S3, extract the key from the URL
    photo_path = photo.path
    if photo_path.startswith("/uploads/"):
        # Local storage: extract relative path
        storage_path = photo_path.replace("/uploads/", "")
    elif "://" in photo_path:
        # S3 URL: extract the key (everything after the bucket/domain)
        from urllib.parse import urlparse
        parsed = urlparse(photo_path)
        storage_path = parsed.path.lstrip("/")
    else:
        storage_path = f"photos/{Path(photo_path).name}"
    
    storage.delete(storage_path)
    
    db.delete(photo)
    db.commit()
    return None
