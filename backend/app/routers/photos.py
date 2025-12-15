from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging
from pathlib import Path
from datetime import datetime
from .. import models, schemas
from ..deps import get_db
from ..storage import get_storage, extract_storage_path

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
            models.Photo.is_primary
        ).update({"is_primary": False})
    
    # If this is set as data tag, unset other data tag photos for this item
    if is_data_tag:
        db.query(models.Photo).filter(
            models.Photo.item_id == item_id,
            models.Photo.is_data_tag
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


@router.get("/{item_id}/photos/{photo_id}", response_model=schemas.Photo)
def get_photo(
    item_id: UUID,
    photo_id: UUID,
    db: Session = Depends(get_db)
):
    """Get details of a specific photo."""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.item_id == item_id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return photo


@router.patch("/{item_id}/photos/{photo_id}", response_model=schemas.Photo)
def update_photo(
    item_id: UUID,
    photo_id: UUID,
    photo_update: schemas.PhotoUpdate,
    db: Session = Depends(get_db)
):
    """Update photo metadata (tags, item association)."""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.item_id == item_id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Determine the target item_id (either the new one or the current one)
    target_item_id = photo_update.item_id if photo_update.item_id is not None else photo.item_id
    
    # If updating item_id, verify new item exists
    if photo_update.item_id is not None:
        new_item = db.query(models.Item).filter(models.Item.id == photo_update.item_id).first()
        if not new_item:
            raise HTTPException(status_code=404, detail="New item not found")
        photo.item_id = photo_update.item_id
    
    # If setting as primary, unset other primary photos for the target item
    if photo_update.is_primary is not None:
        if photo_update.is_primary:
            db.query(models.Photo).filter(
                models.Photo.item_id == target_item_id,
                models.Photo.is_primary,
                models.Photo.id != photo_id
            ).update({"is_primary": False})
        photo.is_primary = photo_update.is_primary
    
    # If setting as data tag, unset other data tag photos for the target item
    if photo_update.is_data_tag is not None:
        if photo_update.is_data_tag:
            db.query(models.Photo).filter(
                models.Photo.item_id == target_item_id,
                models.Photo.is_data_tag,
                models.Photo.id != photo_id
            ).update({"is_data_tag": False})
        photo.is_data_tag = photo_update.is_data_tag
    
    # Update photo_type if provided
    if photo_update.photo_type is not None:
        photo.photo_type = photo_update.photo_type
    
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
    storage = get_storage()
    storage_path = extract_storage_path(photo.path, "photos")
    storage.delete(storage_path)
    
    db.delete(photo)
    db.commit()
    return None
