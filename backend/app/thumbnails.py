
import os
import logging
from pathlib import Path
from PIL import Image, ImageOps
from io import BytesIO

logger = logging.getLogger(__name__)

def create_thumbnail(source_file, destination_path: str, size: tuple = (300, 300), content_type: str = "image/jpeg") -> bool:
    """
    Create a thumbnail from a source file and save it to the destination path.
    
    Args:
        source_file: File-like object or path to source image
        destination_path: Path where thumbnail should be saved (relative to storage root or absolute)
        size: Tuple of (width, height) for maximum thumbnail dimensions
        content_type: MIME type of the image
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Open the image
        img = Image.open(source_file)
        
        # Convert to RGB if necessary (e.g. for PNGs with transparency if saving as JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Correct orientation based on EXIF data
        img = ImageOps.exif_transpose(img)
        
        # Create thumbnail (maintains aspect ratio)
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to BytesIO first to verify
        thumb_io = BytesIO()
        img.save(thumb_io, format="JPEG", quality=85)
        thumb_io.seek(0)
        
        # Save to destination
        # Note: This assumes local filesystem for now. If using cloud storage, 
        # this logic needs to be integrated with the storage provider.
        # However, the current project uses local storage via the 'storage' module.
        
        # If destination_path starts with /, it's absolute. Otherwise relative to app/data/media
        if os.path.isabs(destination_path):
            full_path = Path(destination_path)
        else:
            # Assuming standard storage location
            full_path = Path("/app/data/media") / destination_path
            
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, "wb") as f:
            f.write(thumb_io.getvalue())
            
        return True
        
    except Exception as e:
        logger.error(f"Failed to create thumbnail: {e}")
        return False
