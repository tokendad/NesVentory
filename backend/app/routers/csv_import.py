"""
CSV import router.

Handles importing items from CSV files with support for image URLs.
Supports:
- Basic item fields: name, description, brand, model, serial, location, etc.
- Pricing fields: purchase_price, estimated_value, retailer, purchase_date
- Image URLs: download and attach images from URLs
- Warranty information
- Location creation/association
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from uuid import UUID
import shutil
import csv
import logging
import tempfile
from datetime import datetime, date
from io import StringIO, BytesIO
import httpx
import re

from .. import models, schemas
from ..deps import get_db
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["import"])

# Upload directory for photos
# Media files are stored in /app/data/media to ensure they persist with the database
UPLOAD_DIR = Path("/app/data/media/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# MIME type mapping for image extensions
MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

# CSV column mappings (case-insensitive)
CSV_COLUMNS = {
    # Required
    "name": ["name", "item", "item_name"],
    # Location
    "location": ["location", "location_name", "room", "place"],
    # Item details
    "brand": ["brand", "manufacturer"],
    "model": ["model", "model_number", "model_no"],
    "serial": ["serial", "serial_number", "serial_no", "sn"],
    "description": ["description", "notes", "desc", "details", "item_description"],
    # Purchase info
    "purchase_price": ["purchase_price", "price", "cost", "purchase_cost"],
    "purchase_date": ["purchase_date", "date_purchased", "bought_date"],
    "retailer": ["retailer", "store", "vendor", "seller"],
    "estimated_value": ["estimated_value", "value", "current_value", "replacement_value"],
    # Images
    "image_url": ["image_url", "image", "photo_url", "photo", "picture_url", "picture"],
    "image_urls": ["image_urls", "images", "photos", "pictures"],  # Multiple URLs separated by semicolon or pipe
    # UPC
    "upc": ["upc", "barcode", "upc_code"],
    # Warranty
    "warranty_duration": ["warranty_duration", "warranty", "warranty_months"],
}


def get_mime_type(path: Path) -> str:
    """Get MIME type for an image file based on its extension."""
    ext = path.suffix.lower()
    return MIME_TYPES.get(ext, "image/jpeg")


def normalize_column_name(name: str) -> Optional[str]:
    """
    Normalize a CSV column name to a standard field name with priority handling.
    Prioritizes exact matches over aliases to avoid ambiguity.
    Returns the standard field name or None if not recognized.
    """
    name_lower = name.strip().lower()
    
    # Priority 1: Check for exact matches first (column name matches field name)
    if name_lower in CSV_COLUMNS:
        return name_lower
    
    # Priority 2: Check aliases
    for standard_name, aliases in CSV_COLUMNS.items():
        if name_lower in aliases:
            return standard_name
    
    return None


def parse_date(value: str) -> Optional[date]:
    """Parse a date value from various formats."""
    if not value or not value.strip():
        return None
    
    val_str = value.strip()
    
    # Try various date formats
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%d/%m/%y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%Y/%m/%d",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            continue
    
    return None


def parse_currency(value: str) -> Optional[float]:
    """Parse a currency value, removing symbols and handling formatting."""
    if not value or not value.strip():
        return None
    
    val_str = value.strip()
    
    # Remove currency symbols and commas
    val_str = re.sub(r'[^\d.-]', '', val_str)
    
    if val_str and val_str != '.' and val_str != '-':
        try:
            return float(val_str)
        except ValueError:
            pass
    
    return None


def parse_warranty_duration(value: str) -> Optional[int]:
    """Parse warranty duration, returning months."""
    if not value or not value.strip():
        return None
    
    val_str = value.strip().lower()
    
    # Try to extract number
    match = re.search(r'(\d+)', val_str)
    if not match:
        return None
    
    num = int(match.group(1))
    
    # Check for year indicators
    if 'year' in val_str:
        return num * 12
    
    # Default to months
    return num


async def download_image_from_url(url: str, timeout: int = 30) -> Optional[tuple[bytes, str]]:
    """
    Download an image from a URL.
    Returns (image_bytes, extension) or None if failed.
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
            # Determine file extension from Content-Type or URL
            content_type = response.headers.get("content-type", "").lower()
            extension = ".jpg"  # Default
            
            if "png" in content_type:
                extension = ".png"
            elif "gif" in content_type:
                extension = ".gif"
            elif "webp" in content_type:
                extension = ".webp"
            elif "jpeg" in content_type or "jpg" in content_type:
                extension = ".jpg"
            else:
                # Try to get extension from URL
                url_path = Path(url.split("?")[0])  # Remove query params
                if url_path.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS:
                    extension = url_path.suffix.lower()
            
            return (response.content, extension)
    except Exception as e:
        logger.warning(f"Failed to download image from {url}: {e}")
        return None


class CSVImportResult:
    def __init__(self):
        self.items_created = 0
        self.photos_attached = 0
        self.photos_failed = 0
        self.locations_created = 0
        self.errors: List[str] = []
        self.log: List[str] = []
        self.warnings: List[str] = []


async def process_csv_import(
    csv_content: bytes,
    db: Session,
    parent_location_id: Optional[str] = None,
    create_locations: bool = True
) -> CSVImportResult:
    """
    Process CSV import.
    
    Args:
        csv_content: Bytes content of the CSV file
        db: Database session
        parent_location_id: Optional ID of parent location for created locations
        create_locations: If True, create locations that don't exist
    
    Returns:
        CSVImportResult with details about the import
    """
    result = CSVImportResult()
    
    try:
        # Decode CSV content
        csv_text = csv_content.decode('utf-8-sig')  # utf-8-sig handles BOM
        csv_reader = csv.DictReader(StringIO(csv_text))
        
        # Normalize column names
        if not csv_reader.fieldnames:
            raise ValueError("CSV file has no columns")
        
        # Map CSV columns to standard field names
        column_mapping = {}
        for col_name in csv_reader.fieldnames:
            standard_name = normalize_column_name(col_name)
            if standard_name:
                column_mapping[col_name] = standard_name
        
        # Check for required column (name)
        if "name" not in column_mapping.values():
            raise ValueError("CSV file must contain a 'name' or 'item' column")
        
        result.log.append(f"Detected columns: {list(column_mapping.values())}")
        
        # Cache for locations
        locations_cache = {}
        
        # Load existing locations into cache
        existing_locations = db.query(models.Location).all()
        for loc in existing_locations:
            locations_cache[loc.name.lower()] = loc.id
        
        # Determine parent location if provided
        parent_location_db_id = None
        if parent_location_id:
            try:
                parent_uuid = UUID(parent_location_id)
                parent_location = db.query(models.Location).filter(
                    models.Location.id == parent_uuid
                ).first()
                if parent_location:
                    parent_location_db_id = parent_location.id
                    result.log.append(f"Using parent location: {parent_location.name}")
            except (ValueError, TypeError):
                result.log.append(f"Warning: Invalid parent location ID")
        
        # Process CSV rows
        row_num = 0
        for row in csv_reader:
            row_num += 1
            
            # Normalize row data using column mapping
            normalized_row = {}
            for csv_col, standard_col in column_mapping.items():
                if csv_col in row and row[csv_col]:
                    normalized_row[standard_col] = row[csv_col].strip()
            
            # Skip rows without a name
            if "name" not in normalized_row or not normalized_row["name"]:
                result.log.append(f"Row {row_num}: Skipped (no name)")
                continue
            
            item_name = normalized_row["name"]
            
            # Determine location
            location_id = None
            if "location" in normalized_row:
                location_name = normalized_row["location"]
                location_key = location_name.lower()
                
                if location_key in locations_cache:
                    location_id = locations_cache[location_key]
                elif create_locations:
                    # Create new location
                    new_location = models.Location(
                        name=location_name,
                        parent_id=parent_location_db_id
                    )
                    db.add(new_location)
                    db.flush()
                    locations_cache[location_key] = new_location.id
                    location_id = new_location.id
                    result.locations_created += 1
                    result.log.append(f"  Created location: {location_name}")
            
            # Parse item fields
            brand = normalized_row.get("brand")
            model_number = normalized_row.get("model")
            serial_number = normalized_row.get("serial")
            description = normalized_row.get("description")
            retailer = normalized_row.get("retailer")
            upc = normalized_row.get("upc")
            
            purchase_date = None
            if "purchase_date" in normalized_row:
                purchase_date = parse_date(normalized_row["purchase_date"])
            
            purchase_price = None
            if "purchase_price" in normalized_row:
                purchase_price = parse_currency(normalized_row["purchase_price"])
            
            estimated_value = None
            if "estimated_value" in normalized_row:
                estimated_value = parse_currency(normalized_row["estimated_value"])
            
            # Parse warranty
            warranties = None
            warranty_duration = None
            if "warranty_duration" in normalized_row:
                warranty_duration = parse_warranty_duration(normalized_row["warranty_duration"])
                if warranty_duration:
                    warranties = [{
                        "type": "manufacturer",
                        "duration_months": warranty_duration
                    }]
            
            # Create item
            item = models.Item(
                name=item_name,
                description=description,
                location_id=location_id,
                brand=brand,
                model_number=model_number,
                serial_number=serial_number,
                retailer=retailer,
                purchase_date=purchase_date,
                purchase_price=purchase_price,
                estimated_value=estimated_value,
                upc=upc,
                warranties=warranties
            )
            db.add(item)
            db.flush()
            result.items_created += 1
            
            # Download and attach images from URLs
            image_urls = []
            
            # Single image URL
            if "image_url" in normalized_row:
                image_urls.append(normalized_row["image_url"])
            
            # Multiple image URLs (separated by semicolon or pipe)
            if "image_urls" in normalized_row:
                urls_str = normalized_row["image_urls"]
                for sep in [";", "|"]:
                    if sep in urls_str:
                        image_urls.extend([url.strip() for url in urls_str.split(sep) if url.strip()])
                        break
                else:
                    # No separator found, treat as single URL
                    if urls_str.strip():
                        image_urls.append(urls_str.strip())
            
            # Download and save images
            if image_urls:
                is_first = True
                for url in image_urls:
                    if not url:
                        continue
                    
                    try:
                        image_data = await download_image_from_url(url)
                        if image_data:
                            image_bytes, extension = image_data
                            
                            # Generate unique filename
                            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
                            new_filename = f"{item.id}_{timestamp}{extension}"
                            dest_path = UPLOAD_DIR / new_filename
                            
                            # Save image
                            with open(dest_path, "wb") as f:
                                f.write(image_bytes)
                            
                            # Determine MIME type
                            mime_type = get_mime_type(Path(new_filename))
                            
                            # Create photo record
                            photo = models.Photo(
                                item_id=item.id,
                                path=f"/uploads/photos/{new_filename}",
                                mime_type=mime_type,
                                is_primary=is_first,
                                photo_type="default"
                            )
                            db.add(photo)
                            result.photos_attached += 1
                            is_first = False
                        else:
                            result.photos_failed += 1
                            result.log.append(f"  Failed to download: {url}")
                    except Exception as e:
                        result.photos_failed += 1
                        result.log.append(f"  Error downloading {url}: {str(e)}")
                
                result.log.append(f"Row {row_num}: {item_name} -> {len(image_urls)} image URL(s)")
            else:
                result.log.append(f"Row {row_num}: {item_name} (no images)")
        
        db.commit()
        
        result.log.append("--- Import Summary ---")
        result.log.append(f"Items created: {result.items_created}")
        result.log.append(f"Photos attached: {result.photos_attached}")
        result.log.append(f"Photos failed: {result.photos_failed}")
        result.log.append(f"Locations created: {result.locations_created}")
        
    except Exception as e:
        db.rollback()
        result.errors.append(f"Import failed: {str(e)}")
        result.log.append("Import failed due to an error.")
        logger.exception("CSV import failed")
    
    return result


@router.post("/csv")
async def import_csv(
    csv_file: UploadFile = File(..., description="CSV file to import"),
    parent_location_id: Optional[str] = Form(None, description="ID of parent location for created locations"),
    create_locations: bool = Form(True, description="Create locations that don't exist in the CSV"),
    db: Session = Depends(get_db)
):
    """
    Import items from a CSV file.
    
    The CSV file should contain at minimum a 'name' or 'item' column.
    
    Supported columns (case-insensitive, multiple aliases supported):
    - name, item, item_name
    - location, location_name, room, place
    - brand, manufacturer
    - model, model_number, model_no
    - serial, serial_number, serial_no, sn
    - description, notes, desc, details, item_description
    - purchase_price, price, cost
    - purchase_date, date_purchased, bought_date
    - retailer, store, vendor, seller
    - estimated_value, value, current_value
    - image_url, image, photo_url, photo
    - image_urls, images, photos (multiple URLs separated by semicolon or pipe)
    - upc, barcode, upc_code
    - warranty_duration, warranty, warranty_months
    
    Features:
    - Automatically creates locations if they don't exist
    - Downloads images from URLs
    - Parses dates and currency values
    - Supports multiple image URLs per item
    
    Returns import statistics and log.
    """
    # Validate file type
    if not csv_file.filename or not csv_file.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a CSV file."
        )
    
    # Read CSV content
    csv_content = await csv_file.read()
    
    # Process import
    result = await process_csv_import(
        csv_content=csv_content,
        db=db,
        parent_location_id=parent_location_id,
        create_locations=create_locations
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
        "photos_failed": result.photos_failed,
        "locations_created": result.locations_created,
        "log": result.log,
        "warnings": result.warnings
    }
