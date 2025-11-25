from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import os
import shutil
import logging
from pathlib import Path
from datetime import datetime
from .. import models, schemas
from ..deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/items", tags=["photos"])

# Directory to store uploaded photos - use environment variable or default
UPLOAD_BASE = os.getenv("UPLOAD_DIR", "/app/uploads")
UPLOAD_DIR = Path(UPLOAD_BASE) / "photos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types for photo uploads
ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]


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
    file_extension = Path(file.filename or "").suffix or ".jpg"
    filename = f"{item_id}_{timestamp}{file_extension}"
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
        path=f"/uploads/photos/{filename}",
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
    
    # Delete file from filesystem
    file_path = UPLOAD_DIR / Path(photo.path).name
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete file {file_path}: {e}")
    
    db.delete(photo)
    db.commit()
    return None
