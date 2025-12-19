from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from pathlib import Path
from datetime import datetime
import os
from .. import models, schemas
from ..deps import get_db
from ..storage import get_storage, extract_storage_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["media"])

# Allowed file types
ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm"]

# Map MIME types to safe extensions
MIME_TYPE_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/mpeg": ".mpeg",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/webm": ".webm",
}


@router.get("/stats")
def get_media_stats(db: Session = Depends(get_db)):
    """Get media statistics including total counts and storage info."""
    # Count photos
    total_photos = db.query(models.Photo).count()
    
    # Count videos
    total_videos = db.query(models.Video).count()
    
    # Count location photos
    total_location_photos = db.query(models.LocationPhoto).count()
    
    # Get unique directories (extract from paths)
    photo_paths = db.query(models.Photo.path).all()
    video_paths = db.query(models.Video.path).all()
    location_photo_paths = db.query(models.LocationPhoto.path).all()
    
    directories = set()
    for (path,) in photo_paths + video_paths + location_photo_paths:
        # Extract directory from path
        if path.startswith("/uploads/"):
            clean_path = path.replace("/uploads/", "")
            dir_part = clean_path.split("/")[0] if "/" in clean_path else "root"
            directories.add(dir_part)
    
    # Calculate storage used (approximate based on file system if local storage)
    storage = get_storage()
    total_size = 0
    try:
        if hasattr(storage, 'base_path'):
            # Local storage - calculate actual file sizes
            base_path = Path(storage.base_path)
            for dir_name in ['photos', 'videos', 'location_photos']:
                dir_path = base_path / dir_name
                if dir_path.exists():
                    for file_path in dir_path.rglob('*'):
                        if file_path.is_file():
                            total_size += file_path.stat().st_size
    except Exception as e:
        logger.warning(f"Could not calculate storage size: {e}")
    
    return {
        "total_photos": total_photos + total_location_photos,
        "total_videos": total_videos,
        "total_storage_bytes": total_size,
        "total_storage_mb": round(total_size / (1024 * 1024), 2),
        "directories": sorted(list(directories))
    }


@router.get("/list")
def list_media(
    location_filter: Optional[str] = None,
    media_type: Optional[str] = None,  # 'photo', 'video', or None for all
    unassigned_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all media with optional filtering.
    
    Args:
        location_filter: Filter by location name or ID
        media_type: Filter by media type ('photo' or 'video')
        unassigned_only: Only show media not assigned to any item (photos only)
    """
    results = []
    
    # Fetch photos
    if not media_type or media_type == "photo":
        photo_query = db.query(models.Photo).join(models.Item, models.Photo.item_id == models.Item.id)
        
        if location_filter:
            photo_query = photo_query.join(models.Location, models.Item.location_id == models.Location.id)
            photo_query = photo_query.filter(
                (models.Location.name.ilike(f"%{location_filter}%")) |
                (models.Location.id == location_filter)
            )
        
        photos = photo_query.all()
        for photo in photos:
            results.append({
                "id": str(photo.id),
                "type": "photo",
                "path": photo.path,
                "mime_type": photo.mime_type,
                "uploaded_at": photo.uploaded_at.isoformat(),
                "item_id": str(photo.item_id),
                "item_name": photo.item.name if photo.item else None,
                "location_id": str(photo.item.location_id) if photo.item.location_id else None,
                "location_name": photo.item.location.name if photo.item and photo.item.location else None,
                "is_primary": photo.is_primary,
                "is_data_tag": photo.is_data_tag,
                "photo_type": photo.photo_type
            })
        
        # Fetch location photos
        location_photo_query = db.query(models.LocationPhoto).join(
            models.Location, models.LocationPhoto.location_id == models.Location.id
        )
        
        if location_filter:
            location_photo_query = location_photo_query.filter(
                (models.Location.name.ilike(f"%{location_filter}%")) |
                (models.Location.id == location_filter)
            )
        
        location_photos = location_photo_query.all()
        for photo in location_photos:
            results.append({
                "id": str(photo.id),
                "type": "location_photo",
                "path": photo.path,
                "mime_type": photo.mime_type,
                "uploaded_at": photo.uploaded_at.isoformat(),
                "item_id": None,
                "item_name": None,
                "location_id": str(photo.location_id),
                "location_name": photo.location.name if photo.location else None,
                "is_primary": False,
                "is_data_tag": False,
                "photo_type": photo.photo_type
            })
    
    # Fetch videos
    if not media_type or media_type == "video":
        video_query = db.query(models.Video).join(models.Location, models.Video.location_id == models.Location.id)
        
        if location_filter:
            video_query = video_query.filter(
                (models.Location.name.ilike(f"%{location_filter}%")) |
                (models.Location.id == location_filter)
            )
        
        videos = video_query.all()
        for video in videos:
            results.append({
                "id": str(video.id),
                "type": "video",
                "path": video.path,
                "mime_type": video.mime_type,
                "uploaded_at": video.uploaded_at.isoformat(),
                "item_id": None,
                "item_name": None,
                "location_id": str(video.location_id),
                "location_name": video.location.name if video.location else None,
                "filename": video.filename,
                "video_type": video.video_type
            })
    
    # Sort by uploaded_at descending
    results.sort(key=lambda x: x["uploaded_at"], reverse=True)
    
    return {"media": results}


@router.delete("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_media(
    request: schemas.MediaBulkDeleteRequest,
    db: Session = Depends(get_db)
):
    """Bulk delete media files."""
    media_ids = request.media_ids
    media_types = request.media_types
    
    if len(media_ids) != len(media_types):
        raise HTTPException(
            status_code=400,
            detail="media_ids and media_types must have the same length"
        )
    
    storage = get_storage()
    
    for media_id, media_type in zip(media_ids, media_types):
        try:
            if media_type == "photo":
                photo = db.query(models.Photo).filter(models.Photo.id == media_id).first()
                if photo:
                    storage_path = extract_storage_path(photo.path, "photos")
                    storage.delete(storage_path)
                    db.delete(photo)
            elif media_type == "video":
                video = db.query(models.Video).filter(models.Video.id == media_id).first()
                if video:
                    storage_path = extract_storage_path(video.path, "videos")
                    storage.delete(storage_path)
                    db.delete(video)
            elif media_type == "location_photo":
                location_photo = db.query(models.LocationPhoto).filter(
                    models.LocationPhoto.id == media_id
                ).first()
                if location_photo:
                    storage_path = extract_storage_path(location_photo.path, "location_photos")
                    storage.delete(storage_path)
                    db.delete(location_photo)
        except Exception as e:
            logger.error(f"Error deleting media {media_id} ({media_type}): {e}")
            # Continue with other deletions
    
    db.commit()
    return None


@router.patch("/{media_id}")
async def update_media(
    media_id: str,
    media_type: str,  # 'photo', 'video', 'location_photo'
    item_id: Optional[str] = None,
    photo_type: Optional[str] = None,
    unassign: bool = False,
    db: Session = Depends(get_db)
):
    """
    Update a single media file.
    
    Args:
        media_id: ID of the media
        media_type: Type of media ('photo', 'video', 'location_photo')
        item_id: New item ID to assign to (photos only)
        photo_type: New photo type
        unassign: If true, unassign from current item (photos only, converts to location_photo)
    """
    if media_type == "photo":
        photo = db.query(models.Photo).filter(models.Photo.id == media_id).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        if unassign:
            # Cannot unassign photos - they must be associated with an item
            raise HTTPException(
                status_code=400,
                detail="Photos must be associated with an item. Delete and re-upload as location photo instead."
            )
        
        if item_id:
            # Verify new item exists
            new_item = db.query(models.Item).filter(models.Item.id == item_id).first()
            if not new_item:
                raise HTTPException(status_code=404, detail="Item not found")
            photo.item_id = UUID(item_id)
        
        if photo_type is not None:
            photo.photo_type = photo_type
        
        db.commit()
        db.refresh(photo)
        
        return {
            "id": str(photo.id),
            "type": "photo",
            "path": photo.path,
            "item_id": str(photo.item_id),
            "photo_type": photo.photo_type
        }
    
    elif media_type == "video":
        video = db.query(models.Video).filter(models.Video.id == media_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Videos are associated with locations, not items
        # We don't support reassigning videos in this endpoint
        raise HTTPException(
            status_code=400,
            detail="Video reassignment not supported. Delete and re-upload to different location."
        )
    
    elif media_type == "location_photo":
        location_photo = db.query(models.LocationPhoto).filter(
            models.LocationPhoto.id == media_id
        ).first()
        if not location_photo:
            raise HTTPException(status_code=404, detail="Location photo not found")
        
        if photo_type is not None:
            location_photo.photo_type = photo_type
        
        db.commit()
        db.refresh(location_photo)
        
        return {
            "id": str(location_photo.id),
            "type": "location_photo",
            "path": location_photo.path,
            "location_id": str(location_photo.location_id),
            "photo_type": location_photo.photo_type
        }
    
    raise HTTPException(status_code=400, detail="Invalid media type")
