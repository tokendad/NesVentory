
import sys
import os
from pathlib import Path

# Add backend directory to path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.thumbnails import create_thumbnail
from app.storage import get_storage

def generate_thumbnails():
    db = SessionLocal()
    storage = get_storage()
    
    print("Starting thumbnail generation...")
    
    # 1. Process Item Photos
    photos = db.query(models.Photo).filter(models.Photo.thumbnail_path == None).all()
    print(f"Found {len(photos)} photos without thumbnails.")
    
    for photo in photos:
        try:
            # Check if source file exists
            if not os.path.exists(photo.path):
                # If path starts with /uploads/, strip it to check in local storage
                # Note: photo.path from DB might be URL or path depending on storage backend
                # Assuming local storage for now as per project structure
                print(f"Skipping {photo.id}: File not found at {photo.path}")
                continue
                
            # Determine paths
            # path is likely "/uploads/photos/xyz.jpg" or similar
            # We need the absolute path on disk
            if photo.path.startswith("/uploads/"):
                rel_path = photo.path.replace("/uploads/", "")
                abs_source_path = Path("/app/data/media") / rel_path
            else:
                abs_source_path = Path(photo.path)
            
            if not abs_source_path.exists():
                 print(f"Skipping {photo.id}: Source file not found at {abs_source_path}")
                 continue

            # Construct thumbnail path
            # photos/thumbnails/filename_thumb.jpg
            original_filename = abs_source_path.name
            stem = abs_source_path.stem
            suffix = abs_source_path.suffix
            thumb_filename = f"{stem}_thumb.jpg" # Always save thumbnails as JPG
            
            thumb_rel_path = f"photos/thumbnails/{thumb_filename}"
            thumb_abs_path = Path("/app/data/media") / thumb_rel_path
            
            if create_thumbnail(str(abs_source_path), str(thumb_abs_path)):
                photo.thumbnail_path = f"/uploads/{thumb_rel_path}"
                print(f"Generated thumbnail for photo {photo.id}")
            else:
                print(f"Failed to generate thumbnail for photo {photo.id}")
                
        except Exception as e:
            print(f"Error processing photo {photo.id}: {e}")
            
    db.commit()
    
    # 2. Process Location Photos
    loc_photos = db.query(models.LocationPhoto).filter(models.LocationPhoto.thumbnail_path == None).all()
    print(f"Found {len(loc_photos)} location photos without thumbnails.")
    
    for photo in loc_photos:
        try:
            if photo.path.startswith("/uploads/"):
                rel_path = photo.path.replace("/uploads/", "")
                abs_source_path = Path("/app/data/media") / rel_path
            else:
                abs_source_path = Path(photo.path)
                
            if not abs_source_path.exists():
                 print(f"Skipping {photo.id}: Source file not found at {abs_source_path}")
                 continue

            original_filename = abs_source_path.name
            stem = abs_source_path.stem
            thumb_filename = f"{stem}_thumb.jpg"
            
            thumb_rel_path = f"location_photos/thumbnails/{thumb_filename}"
            thumb_abs_path = Path("/app/data/media") / thumb_rel_path
            
            if create_thumbnail(str(abs_source_path), str(thumb_abs_path)):
                photo.thumbnail_path = f"/uploads/{thumb_rel_path}"
                print(f"Generated thumbnail for location photo {photo.id}")
            else:
                print(f"Failed to generate thumbnail for location photo {photo.id}")
                
        except Exception as e:
            print(f"Error processing location photo {photo.id}: {e}")
            
    db.commit()
    print("Thumbnail generation complete.")
    db.close()

if __name__ == "__main__":
    generate_thumbnails()
