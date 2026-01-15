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
from ..thumbnails import create_thumbnail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/locations", tags=["location_photos"])

# Allowed file types for photo uploads
ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

# Map MIME types to safe extensions
MIME_TYPE_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


@router.post("/{location_id}/photos", response_model=schemas.LocationPhoto, status_code=status.HTTP_201_CREATED)
async def upload_location_photo(
    location_id: UUID,
    file: UploadFile = File(...),
    photo_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a photo for a location."""
    # Verify location exists
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_PHOTO_TYPES)}"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_extension = MIME_TYPE_EXTENSION.get(file.content_type, ".jpg")
    # Use original filename as base, with timestamp for uniqueness
    original_name = Path(file.filename).stem if file.filename else "photo"
    # Sanitize the original name to avoid path traversal - only allow alphanumeric, underscore, and hyphen
    safe_name = "".join(c for c in original_name if c.isalnum() or c in ('_', '-'))[:100]
    if not safe_name:
        safe_name = "photo"
    filename = f"{location_id}_{timestamp}_{safe_name}{file_extension}"
    storage_path = f"location_photos/{filename}"
    
    # Save file using storage backend
    storage = get_storage()
    try:
        file_url = storage.save(file.file, storage_path, content_type=file.content_type)
        
        # Generate thumbnail
        thumbnail_filename = f"{location_id}_{timestamp}_{safe_name}_thumb.jpg"
        thumbnail_storage_path = f"location_photos/thumbnails/{thumbnail_filename}"
        
        # Reset file pointer to beginning for thumbnail generation
        await file.seek(0)
        
        # Create thumbnail
        thumbnail_created = create_thumbnail(
            file.file, 
            thumbnail_storage_path, 
            content_type=file.content_type
        )
        
        thumbnail_url = f"/uploads/{thumbnail_storage_path}" if thumbnail_created else None
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create location photo record
    location_photo = models.LocationPhoto(
        location_id=location_id,
        filename=filename,
        path=file_url,
        thumbnail_path=thumbnail_url,
        mime_type=file.content_type,
        photo_type=photo_type
    )
    
    db.add(location_photo)
    db.commit()
    db.refresh(location_photo)
    
    return location_photo


@router.delete("/{location_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location_photo(
    location_id: UUID,
    photo_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a location photo."""
    location_photo = db.query(models.LocationPhoto).filter(
        models.LocationPhoto.id == photo_id,
        models.LocationPhoto.location_id == location_id
    ).first()
    
    if not location_photo:
        raise HTTPException(status_code=404, detail="Location photo not found")
    
    # Delete file from storage
    storage = get_storage()
    storage_path = extract_storage_path(location_photo.path, "location_photos")
    storage.delete(storage_path)
    
    db.delete(location_photo)
    db.commit()
    return None
