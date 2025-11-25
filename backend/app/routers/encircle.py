"""
Encircle XLSX import router.

Handles importing items and images from Encircle detailed XLSX export files.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import os
import shutil
import re
import logging
import tempfile
from datetime import datetime
from io import BytesIO
from openpyxl import load_workbook

from .. import models, schemas
from ..deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["import"])

# Upload directory for photos
UPLOAD_BASE = os.getenv("UPLOAD_DIR", "/app/uploads")
UPLOAD_DIR = Path(UPLOAD_BASE) / "photos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Column name patterns to identify header row
COL_NO = "No."
COL_NAME = "Description"

# Precompiled regex for numeric prefix matching
NO_PREFIX_RE = re.compile(r"^0*(\d+)_", re.IGNORECASE)

# MIME type mapping for image extensions
MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


def get_mime_type(path: Path) -> str:
    """Get MIME type for an image file based on its extension."""
    ext = path.suffix.lower()
    return MIME_TYPES.get(ext, "image/jpeg")


def normalize_text(s: str) -> str:
    """
    Normalize text for fuzzy matching:
        - lowercase
        - remove all non-alphanumeric chars
    """
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def find_header_row(ws) -> int:
    """
    Find row index with actual headers (contains 'No.' and 'Description').
    """
    for row_idx, row in enumerate(ws.iter_rows(max_row=20, values_only=True), start=1):
        vals = [
            str(v).strip().lower()
            for v in row
            if v is not None and str(v).strip() != ""
        ]
        if not vals:
            continue

        has_no = any(v in ("no.", "no", "#") for v in vals)
        has_desc = "description" in vals

        if has_no and has_desc:
            return row_idx

    raise ValueError(
        "Could not find header row containing 'No.' and 'Description'. "
        "Please confirm the Encircle export format."
    )


def get_column_indices(header_row: tuple) -> dict:
    """
    Map column names to their indices.
    """
    indices = {}
    for idx, value in enumerate(header_row):
        if value is None:
            continue
        val = str(value).strip().lower()
        if val in ("no.", "no", "#"):
            indices["no"] = idx
        elif val == "description":
            indices["description"] = idx
        elif val == "location":
            indices["location"] = idx
        elif val == "qty" or val == "quantity":
            indices["quantity"] = idx
        elif "rcv" in val or "replacement" in val:
            indices["rcv"] = idx
        elif "acv" in val or "actual" in val:
            indices["acv"] = idx
    return indices


def match_images_by_name(images: List[Path], description: str) -> List[Path]:
    """
    Match images whose normalized filename contains the normalized description.
    """
    desc_norm = normalize_text(description)
    if not desc_norm:
        return []

    matches: List[Path] = []
    for path in images:
        stem_norm = normalize_text(path.stem)
        if desc_norm in stem_norm:
            matches.append(path)
    return matches


def match_images_by_number(images: List[Path], item_no: int) -> List[Path]:
    """
    Match images by numeric prefix pattern (e.g., 0003_description.jpg).
    """
    matches: List[Path] = []
    for path in images:
        m = NO_PREFIX_RE.match(path.name)
        if m:
            try:
                no = int(m.group(1))
                if no == item_no:
                    matches.append(path)
            except ValueError:
                continue
    return matches


def classify_image_type(path: Path) -> str:
    """
    Map filename to photo type.
    """
    name = path.name.lower()
    if "receipt" in name:
        return "receipt"
    if "data_tag" in name or "datatag" in name or "tag" in name:
        return "data_tag"
    return "default"


class ImportResult:
    def __init__(self):
        self.items_created = 0
        self.photos_attached = 0
        self.items_without_photos = 0
        self.locations_created = 0
        self.errors: List[str] = []
        self.log: List[str] = []


def process_encircle_import(
    xlsx_content: bytes,
    images: List[tuple],  # List of (filename, content) tuples
    db: Session,
    match_by_name: bool = True
) -> ImportResult:
    """
    Process Encircle XLSX import with optional images.
    
    Args:
        xlsx_content: Bytes content of the XLSX file
        images: List of (filename, content) tuples for images
        db: Database session
        match_by_name: If True, match images by Description; else by No. prefix
    
    Returns:
        ImportResult with details about the import
    """
    result = ImportResult()
    
    try:
        # Load workbook from bytes
        wb = load_workbook(filename=BytesIO(xlsx_content), data_only=True)
        ws = wb.active
        
        # Find header row
        header_row_idx = find_header_row(ws)
        result.log.append(f"Detected header row at row {header_row_idx}")
        
        # Get header row and column indices
        header_row = list(ws.iter_rows(min_row=header_row_idx, max_row=header_row_idx, values_only=True))[0]
        col_indices = get_column_indices(header_row)
        
        if "no" not in col_indices or "description" not in col_indices:
            raise ValueError("Required columns 'No.' and 'Description' not found in header row")
        
        result.log.append(f"Column mapping: {col_indices}")
        
        # Create temp directory for images if needed
        image_paths: List[Path] = []
        temp_dir = None
        
        if images:
            temp_dir = Path(tempfile.mkdtemp())
            for filename, content in images:
                img_path = temp_dir / filename
                with open(img_path, "wb") as f:
                    f.write(content)
                image_paths.append(img_path)
            result.log.append(f"Indexed {len(image_paths)} images for matching")
        
        # Cache for locations
        locations_cache: dict = {}
        
        # Load existing locations into cache
        existing_locations = db.query(models.Location).all()
        for loc in existing_locations:
            locations_cache[loc.name.lower()] = loc.id
        
        # Process data rows
        for row_idx, row in enumerate(ws.iter_rows(min_row=header_row_idx + 1, values_only=True), start=header_row_idx + 1):
            # Skip empty rows
            if not row or all(cell is None or str(cell).strip() == "" for cell in row):
                continue
            
            # Extract data
            raw_no = row[col_indices["no"]] if "no" in col_indices else None
            raw_name = row[col_indices["description"]] if "description" in col_indices else None
            
            if raw_no is None or raw_name is None:
                continue
            
            # Parse item number
            try:
                no = int(str(raw_no).strip().split(".")[0])
            except (TypeError, ValueError):
                continue
            
            name = str(raw_name).strip()
            if not name:
                continue
            
            # Get location if available
            location_name = "Uncategorized"
            if "location" in col_indices and row[col_indices["location"]]:
                location_name = str(row[col_indices["location"]]).strip() or "Uncategorized"
            
            # Get or create location
            location_key = location_name.lower()
            if location_key not in locations_cache:
                new_location = models.Location(name=location_name)
                db.add(new_location)
                db.flush()
                locations_cache[location_key] = new_location.id
                result.locations_created += 1
                result.log.append(f"Created location: {location_name}")
            
            location_id = locations_cache[location_key]
            
            # Get estimated value if available
            estimated_value = None
            if "rcv" in col_indices and row[col_indices["rcv"]]:
                try:
                    val_str = str(row[col_indices["rcv"]]).strip()
                    # Remove currency symbols and commas, keep only digits and first decimal
                    val_str = re.sub(r'[^\d.]', '', val_str)
                    # Handle multiple decimal points by keeping only the first
                    if val_str.count('.') > 1:
                        parts = val_str.split('.')
                        val_str = parts[0] + '.' + ''.join(parts[1:])
                    if val_str and val_str != '.':
                        estimated_value = float(val_str)
                except (ValueError, TypeError):
                    pass
            
            # Create item
            item = models.Item(
                name=name,
                location_id=location_id,
                estimated_value=estimated_value
            )
            db.add(item)
            db.flush()
            result.items_created += 1
            
            # Match and attach images
            if image_paths:
                if match_by_name:
                    matched_images = match_images_by_name(image_paths, name)
                    if not matched_images:
                        # Fallback to number matching
                        matched_images = match_images_by_number(image_paths, no)
                else:
                    matched_images = match_images_by_number(image_paths, no)
                
                if matched_images:
                    is_first = True
                    for img_path in matched_images:
                        # Generate unique filename
                        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
                        file_extension = img_path.suffix or ".jpg"
                        new_filename = f"{item.id}_{timestamp}{file_extension}"
                        dest_path = UPLOAD_DIR / new_filename
                        
                        # Copy image to uploads
                        shutil.copy2(img_path, dest_path)
                        
                        # Determine photo type and MIME type
                        photo_type = classify_image_type(img_path)
                        mime_type = get_mime_type(img_path)
                        is_primary = is_first and photo_type == "default"
                        is_data_tag = photo_type == "data_tag"
                        
                        # Create photo record
                        photo = models.Photo(
                            item_id=item.id,
                            path=f"/uploads/photos/{new_filename}",
                            mime_type=mime_type,
                            is_primary=is_primary,
                            is_data_tag=is_data_tag,
                            photo_type=photo_type
                        )
                        db.add(photo)
                        result.photos_attached += 1
                        is_first = False
                    
                    result.log.append(f"Item #{no}: {name} -> {len(matched_images)} photo(s)")
                else:
                    result.items_without_photos += 1
                    result.log.append(f"Item #{no}: {name} -> no photos matched")
            else:
                result.items_without_photos += 1
        
        db.commit()
        
        # Cleanup temp directory
        if temp_dir and temp_dir.exists():
            try:
                shutil.rmtree(temp_dir)
            except Exception as cleanup_err:
                logger.warning(f"Failed to cleanup temp directory {temp_dir}: {cleanup_err}")
        
        result.log.append("--- Import Summary ---")
        result.log.append(f"Items created: {result.items_created}")
        result.log.append(f"Photos attached: {result.photos_attached}")
        result.log.append(f"Items without photos: {result.items_without_photos}")
        result.log.append(f"Locations created: {result.locations_created}")
        
    except Exception as e:
        db.rollback()
        result.errors.append("An internal error occurred during import.")
        result.log.append("Import failed due to an internal error.")
        logger.exception("Encircle import failed")
    
    return result


@router.post("/encircle")
async def import_encircle(
    xlsx_file: UploadFile = File(..., description="Encircle XLSX export file"),
    images: Optional[List[UploadFile]] = File(None, description="Image files to import"),
    match_by_name: bool = Form(True, description="Match images by description name"),
    db: Session = Depends(get_db)
):
    """
    Import items from an Encircle detailed XLSX export file.
    
    Optionally include image files that will be matched to items either by:
    - Description name (default): normalized filename contains the item description
    - Number prefix: filename starts with the item number (e.g., 0003_item.jpg)
    
    Returns import statistics and log.
    """
    # Validate file type
    if not xlsx_file.filename or not xlsx_file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an XLSX file."
        )
    
    # Read xlsx content
    xlsx_content = await xlsx_file.read()
    
    # Read images if provided
    image_data: List[tuple] = []
    if images:
        for img in images:
            if img.filename:
                ext = Path(img.filename).suffix.lower()
                if ext in ALLOWED_IMAGE_EXTENSIONS:
                    content = await img.read()
                    image_data.append((img.filename, content))
    
    # Process import
    result = process_encircle_import(
        xlsx_content=xlsx_content,
        images=image_data,
        db=db,
        match_by_name=match_by_name
    )
    
    if result.errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Import failed",
                "errors": result.errors,
                "log": result.log
            }
        )
    
    return {
        "message": "Import completed successfully",
        "items_created": result.items_created,
        "photos_attached": result.photos_attached,
        "items_without_photos": result.items_without_photos,
        "locations_created": result.locations_created,
        "log": result.log
    }
