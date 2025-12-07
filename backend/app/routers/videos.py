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

router = APIRouter(prefix="/locations", tags=["videos"])

# Allowed file types for video uploads
ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
]

# Map MIME types to safe extensions
MIME_TYPE_EXTENSION = {
    "video/mp4": ".mp4",
    "video/mpeg": ".mpeg",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/webm": ".webm",
}


@router.post("/{location_id}/videos", response_model=schemas.Video, status_code=status.HTTP_201_CREATED)
async def upload_video(
    location_id: UUID,
    file: UploadFile = File(...),
    video_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a video for a location (room)."""
    # Verify location exists
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_VIDEO_TYPES)}"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_extension = MIME_TYPE_EXTENSION.get(file.content_type, ".mp4")
    # Use original filename as base, with timestamp for uniqueness
    original_name = Path(file.filename).stem if file.filename else "video"
    # Sanitize the original name to avoid path traversal - only allow alphanumeric, underscore, and hyphen
    safe_name = "".join(c for c in original_name if c.isalnum() or c in ('_', '-'))[:100]
    if not safe_name:
        safe_name = "video"
    filename = f"{location_id}_{timestamp}_{safe_name}{file_extension}"
    storage_path = f"videos/{filename}"
    
    # Save file using storage backend
    storage = get_storage()
    try:
        file_url = storage.save(file.file, storage_path, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create video record
    video = models.Video(
        location_id=location_id,
        filename=file.filename or filename,
        path=file_url,
        mime_type=file.content_type,
        video_type=video_type
    )
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    return video


@router.delete("/{location_id}/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    location_id: UUID,
    video_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a video."""
    video = db.query(models.Video).filter(
        models.Video.id == video_id,
        models.Video.location_id == location_id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete file from storage
    storage = get_storage()
    storage_path = extract_storage_path(video.path, "videos")
    storage.delete(storage_path)
    
    db.delete(video)
    db.commit()
    return None
