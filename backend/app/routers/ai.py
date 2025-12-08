"""
AI-powered image analysis router.

Uses Google Gemini to detect and identify items in photos.
Includes request throttling to avoid rate limits on free tier.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime, timezone
from pathlib import Path
import base64
import json
import logging
import re
import time

from ..config import settings
from ..deps import get_db
from .. import models, schemas, auth
from ..settings_service import get_effective_gemini_api_key

logger = logging.getLogger(__name__)


# Error message for quota exceeded
QUOTA_EXCEEDED_MESSAGE = (
    "Gemini API rate limit exceeded. Your current tier's quota has been reached. "
    "Please retry later or consider upgrading your tier. "
    "See: https://ai.google.dev/gemini-api/docs/rate-limits"
)

# Track last AI request time for throttling
_last_ai_request_time: float = 0.0


def throttle_ai_request():
    """
    Throttle AI requests to avoid rate limits on free tier.
    
    This function sleeps if needed to ensure minimum delay between requests.
    The delay is configurable via GEMINI_REQUEST_DELAY (default: 4 seconds).
    """
    global _last_ai_request_time
    
    delay = settings.GEMINI_REQUEST_DELAY
    if delay <= 0:
        return
    
    current_time = time.time()
    elapsed = current_time - _last_ai_request_time
    
    if elapsed < delay:
        sleep_time = delay - elapsed
        logger.debug(f"Throttling AI request: sleeping {sleep_time:.2f}s")
        time.sleep(sleep_time)
    
    _last_ai_request_time = time.time()


def is_quota_error(error: Exception) -> bool:
    """
    Check if the error is a Gemini API quota exceeded error.
    
    Returns True if the error indicates rate limiting or quota exceeded.
    """
    error_str = str(error).lower()
    quota_indicators = [
        "quota exceeded",
        "rate limit",
        "resource exhausted",
        "429",
        "too many requests",
        "quota_exceeded",
        "rate_limit",
        "resourceexhausted",
        "free_tier_requests",
        "generate_content_free_tier",
    ]
    return any(indicator in error_str for indicator in quota_indicators)


class QuotaExceededError(Exception):
    """Custom exception for Gemini API quota exceeded errors."""
    pass

router = APIRouter(prefix="/ai", tags=["ai"])

# Allowed image types for AI analysis
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

# Item name length constraints for parsing plain text fallback
MIN_ITEM_NAME_LENGTH = 2
MAX_ITEM_NAME_LENGTH = 100

# UPC/barcode length constraints
# UPC-E: 6-8 digits (compressed), UPC-A: 12 digits, EAN-8: 8 digits
# EAN-13: 13 digits, GTIN-14: 14 digits
MIN_UPC_LENGTH = 6
MAX_UPC_LENGTH = 14


class DetectedItem(BaseModel):
    """Schema for a detected item from AI analysis."""
    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    estimated_value: Optional[float] = None
    confidence: Optional[float] = None
    estimation_date: Optional[str] = None  # Date when AI estimated the value (MM/DD/YY format)


class DetectionResult(BaseModel):
    """Schema for the AI detection response."""
    items: List[DetectedItem]
    raw_response: Optional[str] = None


class AIStatusResponse(BaseModel):
    """Schema for AI feature status."""
    enabled: bool
    model: Optional[str] = None
    plugins_enabled: bool = False
    plugin_count: int = 0


class DataTagInfo(BaseModel):
    """Schema for parsed data tag information."""
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    production_date: Optional[str] = None
    estimated_value: Optional[float] = None  # Estimated value in USD
    estimation_date: Optional[str] = None  # Date when AI estimated the value (MM/DD/YY format)
    additional_info: Optional[dict] = None
    raw_response: Optional[str] = None


class BarcodeLookupRequest(BaseModel):
    """Schema for barcode lookup request."""
    upc: str


class BarcodeLookupResult(BaseModel):
    """Schema for barcode lookup response."""
    found: bool
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    estimated_value: Optional[float] = None
    estimation_date: Optional[str] = None  # Date when AI estimated the value (MM/DD/YY format)
    category: Optional[str] = None
    raw_response: Optional[str] = None


class BarcodeScanResult(BaseModel):
    """Schema for barcode scan response (reading barcode from image)."""
    found: bool
    upc: Optional[str] = None
    raw_response: Optional[str] = None


class MultiBarcodeLookupRequest(BaseModel):
    """Schema for multi-database barcode lookup request."""
    upc: str
    database_id: Optional[str] = None  # If None, uses first database in user's priority list


class MultiBarcodeLookupResult(BaseModel):
    """Schema for multi-database barcode lookup response."""
    found: bool
    source: str  # The database that returned this result
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    estimated_value: Optional[float] = None
    estimation_date: Optional[str] = None
    category: Optional[str] = None
    raw_response: Optional[str] = None
    # Information about next database in priority
    has_next_database: bool = False
    next_database_id: Optional[str] = None
    next_database_name: Optional[str] = None


def parse_gemini_response(response_text: str) -> List[DetectedItem]:
    """
    Parse the Gemini response text into a list of DetectedItem objects.
    
    The AI is prompted to return JSON, but we handle various response formats.
    """
    items = []
    
    # Try to extract JSON from the response
    try:
        # Look for JSON array in the response
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if json_match:
            json_str = json_match.group()
            parsed = json.loads(json_str)
            
            if isinstance(parsed, list):
                for item_data in parsed:
                    if isinstance(item_data, dict):
                        # Handle various field name formats
                        name = (
                            item_data.get("name") or 
                            item_data.get("item_name") or 
                            item_data.get("object") or
                            "Unknown Item"
                        )
                        
                        description = (
                            item_data.get("description") or 
                            item_data.get("desc") or
                            None
                        )
                        
                        brand = (
                            item_data.get("brand") or 
                            item_data.get("manufacturer") or
                            None
                        )
                        
                        # Parse estimated value
                        estimated_value = None
                        value_str = item_data.get("estimated_value") or item_data.get("value")
                        if value_str:
                            try:
                                if isinstance(value_str, (int, float)):
                                    estimated_value = float(value_str)
                                else:
                                    # Remove currency symbols and parse
                                    clean_value = re.sub(r'[^\d.]', '', str(value_str))
                                    if clean_value:
                                        estimated_value = float(clean_value)
                            except (ValueError, TypeError):
                                pass
                        
                        # Parse confidence
                        confidence = None
                        conf_value = item_data.get("confidence")
                        if conf_value is not None:
                            try:
                                confidence = float(conf_value)
                                # Normalize to 0-1 if given as percentage
                                if confidence > 1:
                                    confidence = confidence / 100
                            except (ValueError, TypeError):
                                pass
                        
                        # Add estimation date if there's an estimated value
                        estimation_date = None
                        if estimated_value is not None:
                            estimation_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                        
                        items.append(DetectedItem(
                            name=name,
                            description=description,
                            brand=brand,
                            estimated_value=estimated_value,
                            confidence=confidence,
                            estimation_date=estimation_date
                        ))
        
        if not items:
            # Fallback: try to parse as a single JSON object
            json_obj_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_obj_match:
                parsed = json.loads(json_obj_match.group())
                if isinstance(parsed, dict):
                    # Check if it has an "items" key
                    if "items" in parsed and isinstance(parsed["items"], list):
                        return parse_gemini_response(json.dumps(parsed["items"]))
                    # Otherwise treat as a single item
                    # Parse estimated value if present
                    estimated_value = None
                    value_str = parsed.get("estimated_value") or parsed.get("value")
                    if value_str:
                        try:
                            if isinstance(value_str, (int, float)):
                                estimated_value = float(value_str)
                            else:
                                clean_value = re.sub(r'[^\d.]', '', str(value_str))
                                if clean_value:
                                    estimated_value = float(clean_value)
                        except (ValueError, TypeError):
                            pass
                    
                    # Add estimation date if there's an estimated value
                    estimation_date = None
                    if estimated_value is not None:
                        estimation_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                    
                    items.append(DetectedItem(
                        name=parsed.get("name", "Unknown Item"),
                        description=parsed.get("description"),
                        brand=parsed.get("brand"),
                        estimated_value=estimated_value,
                        confidence=None,
                        estimation_date=estimation_date
                    ))
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from Gemini response")
    
    # If no items parsed, try to extract item names from plain text
    # Note: Plain text fallback doesn't provide estimated values, so estimation_date is None
    if not items:
        # Split by common delimiters and look for item-like entries
        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and len(line) > MIN_ITEM_NAME_LENGTH and len(line) < MAX_ITEM_NAME_LENGTH:
                # Skip lines that look like headers or instructions
                if any(skip in line.lower() for skip in ['here are', 'detected', 'found', 'items:', 'list']):
                    continue
                # Remove common prefixes like "- ", "* ", "1. "
                cleaned = re.sub(r'^[-*•]\s*', '', line)
                cleaned = re.sub(r'^\d+[.)\s]+', '', cleaned)
                if cleaned and len(cleaned) > MIN_ITEM_NAME_LENGTH:
                    items.append(DetectedItem(name=cleaned, estimation_date=None))
    
    return items


def parse_data_tag_response(response_text: str) -> DataTagInfo:
    """
    Parse the Gemini response text for data tag information.
    
    The AI is prompted to return JSON with specific fields.
    """
    result = DataTagInfo()
    
    try:
        # Look for JSON object in the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group()
            parsed = json.loads(json_str)
            
            if isinstance(parsed, dict):
                # Extract manufacturer first (used as fallback for brand)
                manufacturer = (
                    parsed.get("manufacturer") or
                    parsed.get("mfr") or
                    parsed.get("maker") or
                    None
                )
                result.manufacturer = manufacturer
                
                # Extract brand (falls back to manufacturer if not found)
                result.brand = (
                    parsed.get("brand") or
                    parsed.get("brand_name") or
                    manufacturer  # Fall back to manufacturer if brand not found
                )
                
                # Extract model number
                result.model_number = (
                    parsed.get("model_number") or
                    parsed.get("model") or
                    parsed.get("model_no") or
                    parsed.get("part_number") or
                    None
                )
                
                # Extract serial number
                result.serial_number = (
                    parsed.get("serial_number") or
                    parsed.get("serial") or
                    parsed.get("serial_no") or
                    parsed.get("sn") or
                    None
                )
                
                # Extract production date
                result.production_date = (
                    parsed.get("production_date") or
                    parsed.get("manufacture_date") or
                    parsed.get("mfg_date") or
                    parsed.get("date") or
                    parsed.get("date_of_manufacture") or
                    None
                )
                
                # Parse estimated value
                estimated_value = None
                value_str = parsed.get("estimated_value") or parsed.get("value") or parsed.get("estimated_price")
                if value_str:
                    try:
                        if isinstance(value_str, (int, float)):
                            estimated_value = float(value_str)
                        else:
                            # Remove currency symbols and parse
                            clean_value = re.sub(r'[^\d.]', '', str(value_str))
                            if clean_value:
                                estimated_value = float(clean_value)
                    except (ValueError, TypeError):
                        pass
                
                result.estimated_value = estimated_value
                
                # Add estimation date if there's an estimated value
                if estimated_value is not None:
                    result.estimation_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                
                # Collect any additional fields not already captured
                known_fields = {
                    "manufacturer", "mfr", "maker", "brand", "brand_name",
                    "model_number", "model", "model_no", "part_number",
                    "serial_number", "serial", "serial_no", "sn",
                    "production_date", "manufacture_date", "mfg_date", "date", "date_of_manufacture",
                    "estimated_value", "value", "estimated_price"
                }
                additional = {k: v for k, v in parsed.items() if k not in known_fields and v is not None}
                if additional:
                    result.additional_info = additional
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from Gemini data tag response")
        result.raw_response = response_text
    
    return result


@router.get("/status", response_model=AIStatusResponse)
def get_ai_status(db: Session = Depends(get_db)):
    """
    Check if AI detection feature is enabled and configured.
    Checks both environment variables and database settings, as well as custom LLM plugins.
    """
    gemini_api_key = get_effective_gemini_api_key(db)
    is_enabled = bool(gemini_api_key)
    
    # Check for enabled plugins
    from ..plugin_service import get_enabled_ai_scan_plugins
    plugins = get_enabled_ai_scan_plugins(db)
    
    return AIStatusResponse(
        enabled=is_enabled or len(plugins) > 0,  # Enabled if Gemini OR plugins are configured
        model=settings.GEMINI_MODEL if is_enabled else None,
        plugins_enabled=len(plugins) > 0,
        plugin_count=len(plugins)
    )


@router.post("/detect-items", response_model=DetectionResult)
async def detect_items(
    file: UploadFile = File(..., description="Image file to analyze for items"),
    use_plugin: bool = True,  # Parameter to enable/disable plugin usage
    db: Session = Depends(get_db)
):
    """
    Analyze an uploaded image using AI to detect household items.
    
    Returns a list of detected items with names, descriptions, and estimated values.
    These can be used to create inventory items.
    
    If custom LLM plugins are enabled for AI scan, they will be tried first
    before falling back to the default Gemini AI.
    """
    # Try custom LLM plugins first if enabled
    if use_plugin:
        from ..plugin_service import get_enabled_ai_scan_plugins, detect_items_with_plugin
        
        # Get plugins that support image processing for item detection
        plugins = get_enabled_ai_scan_plugins(db, requires_image_processing=True)
        
        if plugins:
            # Read the image data once
            image_data = await file.read()
            
            # Try each plugin in priority order
            for plugin in plugins:
                logger.info(f"Trying plugin: {plugin.name} for item detection")
                result = await detect_items_with_plugin(plugin, image_data, file.content_type or "image/jpeg")
                
                if result and result.get("items"):
                    # Convert plugin result to DetectionResult
                    # The plugin should return data in a compatible format
                    items = [DetectedItem(**item) for item in result.get("items", [])]
                    return DetectionResult(
                        items=items,
                        raw_response=result.get("raw_response")
                    )
            
            logger.info("All plugins failed, falling back to Gemini AI")
            # Reset file position for Gemini fallback
            await file.seek(0)
    
    # Check if Gemini API is configured (env or database)
    gemini_api_key = get_effective_gemini_api_key(db)
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment or configure it in the admin panel."
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    try:
        # Import Gemini SDK
        import google.generativeai as genai
        
        # Configure the API with effective key
        genai.configure(api_key=gemini_api_key)
        
        # Read and encode the image
        image_data = await file.read()
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Create the model
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Construct the prompt
        prompt = """Analyze this image and identify all visible household items, furniture, electronics, 
and other objects that would be valuable to track in a home inventory system.

For each item detected, provide:
1. name: A clear, specific name for the item
2. description: A brief description including color, size, or notable features
3. brand: The brand/manufacturer if visible or identifiable
4. estimated_value: An approximate value in USD (just the number)
5. confidence: Your confidence in the identification (0.0 to 1.0)

Return ONLY a JSON array of objects with these fields. Example format:
[
  {"name": "Samsung 55-inch TV", "description": "Flat screen smart TV mounted on wall", "brand": "Samsung", "estimated_value": 500, "confidence": 0.9},
  {"name": "Leather Sofa", "description": "Brown leather 3-seater sofa", "brand": null, "estimated_value": 800, "confidence": 0.85}
]

Focus on items that would be important for home insurance or inventory purposes.
Return an empty array [] if no identifiable items are found."""

        # Create the image part for the API
        image_part = {
            "mime_type": file.content_type,
            "data": image_base64
        }
        
        # Generate the response
        response = model.generate_content([prompt, image_part])
        
        # Parse the response
        response_text = response.text
        items = parse_gemini_response(response_text)
        
        return DetectionResult(
            items=items,
            raw_response=response_text if not items else None
        )
        
    except ImportError:
        logger.error("google-generativeai package not installed")
        raise HTTPException(
            status_code=503,
            detail="AI detection is not available. Required package not installed."
        )
    except Exception as e:
        logger.exception("Error during AI item detection")
        error_msg = str(e)
        # Check for quota exceeded error
        if is_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=QUOTA_EXCEEDED_MESSAGE
            )
        # Don't expose internal error details
        if "API key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="AI service authentication failed. Please check GEMINI_API_KEY configuration."
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze image. Please try again."
        )


@router.post("/parse-data-tag", response_model=DataTagInfo)
async def parse_data_tag(
    file: UploadFile = File(..., description="Image of a data tag/label to parse"),
    use_plugin: bool = True,  # New parameter to enable/disable plugin usage
    db: Session = Depends(get_db)
):
    """
    Analyze an uploaded image of a data tag/label using AI.
    
    Extracts manufacturer, serial number, model number, and production date
    from product data tags, labels, or identification plates.
    
    If custom LLM plugins are enabled for AI scan, they will be tried first
    before falling back to the default Gemini AI.
    """
    # Try custom LLM plugins first if enabled
    if use_plugin:
        from ..plugin_service import get_enabled_ai_scan_plugins, parse_data_tag_with_plugin
        
        # Get plugins that support image processing for data tag parsing
        plugins = get_enabled_ai_scan_plugins(db, requires_image_processing=True)
        
        if plugins:
            # Read the image data once
            image_data = await file.read()
            
            # Try each plugin in priority order
            for plugin in plugins:
                logger.info(f"Trying plugin: {plugin.name} for data tag parsing")
                result = await parse_data_tag_with_plugin(plugin, image_data, file.content_type or "image/jpeg")
                
                if result:
                    # Convert plugin result to DataTagInfo
                    # The plugin should return data in a compatible format
                    data_tag_info = DataTagInfo(**result)
                    return data_tag_info
            
            logger.info("All plugins failed, falling back to Gemini AI")
            # Reset file position for Gemini fallback
            await file.seek(0)
    
    # Check if Gemini API is configured (env or database)
    gemini_api_key = get_effective_gemini_api_key(db)
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment or configure it in the admin panel."
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    try:
        # Import Gemini SDK
        import google.generativeai as genai
        
        # Configure the API with effective key
        genai.configure(api_key=gemini_api_key)
        
        # Read and encode the image
        image_data = await file.read()
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Create the model
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Construct the prompt for data tag parsing
        prompt = """Analyze this image of a product data tag, label, or identification plate.

Extract the following information if visible:
1. manufacturer: The company/manufacturer name
2. brand: The brand name (may be same as manufacturer)
3. model_number: The model number or part number
4. serial_number: The serial number (S/N)
5. production_date: The manufacturing/production date (format as YYYY-MM-DD if possible, or original format if not clear)
6. estimated_value: Based on the manufacturer, brand, and model information, estimate the current market value in USD (just the number, no currency symbol)

Also extract any other relevant product information you can find on the tag such as:
- voltage/wattage/power ratings
- certifications (UL, CE, etc.)
- country of origin
- capacity/dimensions

Return ONLY a JSON object with these fields. Use null for any field that is not visible or cannot be determined.

Example format:
{
  "manufacturer": "Samsung Electronics",
  "brand": "Samsung",
  "model_number": "UN55TU8000FXZA",
  "serial_number": "ABC123456789",
  "production_date": "2023-05-15",
  "estimated_value": 450,
  "voltage": "120V",
  "wattage": "150W",
  "country": "Korea"
}

If no data tag information can be read from the image, return:
{"manufacturer": null, "brand": null, "model_number": null, "serial_number": null, "production_date": null, "estimated_value": null}"""

        # Create the image part for the API
        image_part = {
            "mime_type": file.content_type,
            "data": image_base64
        }
        
        # Generate the response
        response = model.generate_content([prompt, image_part])
        
        # Parse the response
        response_text = response.text
        result = parse_data_tag_response(response_text)
        
        # If parsing failed, include raw response
        if not any([result.manufacturer, result.brand, result.model_number, 
                    result.serial_number, result.production_date]):
            result.raw_response = response_text
        
        return result
        
    except ImportError:
        logger.error("google-generativeai package not installed")
        raise HTTPException(
            status_code=503,
            detail="AI detection is not available. Required package not installed."
        )
    except Exception as e:
        logger.exception("Error during AI data tag parsing")
        error_msg = str(e)
        # Check for quota exceeded error
        if is_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=QUOTA_EXCEEDED_MESSAGE
            )
        # Don't expose internal error details
        if "API key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="AI service authentication failed. Please check GEMINI_API_KEY configuration."
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze data tag image. Please try again."
        )


def parse_barcode_lookup_response(response_text: str) -> BarcodeLookupResult:
    """
    Parse the Gemini response text for barcode lookup information.
    
    The AI is prompted to return JSON with specific fields.
    """
    result = BarcodeLookupResult(found=False)
    
    try:
        # Look for JSON object in the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group()
            parsed = json.loads(json_str)
            
            if isinstance(parsed, dict):
                # Check if product was found
                found = parsed.get("found", False)
                if found is True or (isinstance(found, str) and found.lower() == "true"):
                    result.found = True
                else:
                    result.found = False
                    result.raw_response = response_text
                    return result
                
                # Extract product name
                result.name = (
                    parsed.get("name") or
                    parsed.get("product_name") or
                    parsed.get("title") or
                    None
                )
                
                # Extract description
                result.description = (
                    parsed.get("description") or
                    parsed.get("product_description") or
                    None
                )
                
                # Extract brand
                result.brand = (
                    parsed.get("brand") or
                    parsed.get("manufacturer") or
                    None
                )
                
                # Extract model number
                result.model_number = (
                    parsed.get("model_number") or
                    parsed.get("model") or
                    parsed.get("model_no") or
                    None
                )
                
                # Extract category
                result.category = (
                    parsed.get("category") or
                    parsed.get("product_category") or
                    None
                )
                
                # Parse estimated value
                estimated_value = None
                value_str = parsed.get("estimated_value") or parsed.get("value") or parsed.get("price")
                if value_str:
                    try:
                        if isinstance(value_str, (int, float)):
                            estimated_value = float(value_str)
                        else:
                            # Remove currency symbols and parse
                            clean_value = re.sub(r'[^\d.]', '', str(value_str))
                            if clean_value:
                                estimated_value = float(clean_value)
                    except (ValueError, TypeError):
                        pass
                
                result.estimated_value = estimated_value
                
                # Add estimation date if there's an estimated value
                if estimated_value is not None:
                    result.estimation_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                    
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from Gemini barcode lookup response")
        result.raw_response = response_text
    
    return result


@router.post("/barcode-lookup", response_model=BarcodeLookupResult)
async def lookup_barcode(
    request: BarcodeLookupRequest,
    use_plugin: bool = True,  # New parameter to enable/disable plugin usage
    db: Session = Depends(get_db)
):
    """
    Look up product information using a barcode/UPC code.
    
    Uses custom LLM plugins (if configured) or Gemini AI to identify the product 
    and provide details like:
    - Product name
    - Brand/Manufacturer
    - Description
    - Estimated value
    - Category
    
    Note: This uses AI to look up products based on UPC codes. Results
    may vary in accuracy as the AI uses its training data to identify products.
    """
    # Validate UPC format (basic validation)
    upc = request.upc.strip()
    if not upc:
        raise HTTPException(
            status_code=400,
            detail="UPC code is required."
        )
    
    # UPC codes come in various formats:
    # - UPC-A: 12 digits (most common in North America)
    # - UPC-E: 6-8 digits (compressed UPC-A)
    # - EAN-8: 8 digits (European)
    # - EAN-13: 13 digits (International)
    # - GTIN-14: 14 digits (Global Trade Item Number)
    # Remove any hyphens or spaces for validation
    upc_clean = re.sub(r'[\s\-]', '', upc)
    if not upc_clean.isdigit() or len(upc_clean) < 6 or len(upc_clean) > 14:
        raise HTTPException(
            status_code=400,
            detail="Invalid UPC code format. UPC should be 6-14 digits."
        )
    
    # Try custom LLM plugins first if enabled
    if use_plugin:
        from ..plugin_service import get_enabled_ai_scan_plugins, lookup_barcode_with_plugin
        
        plugins = get_enabled_ai_scan_plugins(db)
        
        if plugins:
            # Try each plugin in priority order
            for plugin in plugins:
                logger.info(f"Trying plugin: {plugin.name} for barcode lookup")
                result = await lookup_barcode_with_plugin(plugin, upc_clean)
                
                if result and result.get('found'):
                    # Convert plugin result to BarcodeLookupResult
                    return BarcodeLookupResult(**result)
            
            logger.info("All plugins failed, falling back to Gemini AI")
    
    # Check if Gemini API is configured (env or database)
    gemini_api_key = get_effective_gemini_api_key(db)
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment or configure it in the admin panel."
        )
    
    try:
        # Import Gemini SDK
        import google.generativeai as genai
        
        # Throttle requests to avoid rate limits
        throttle_ai_request()
        
        # Configure the API with effective key
        genai.configure(api_key=gemini_api_key)
        
        # Create the model
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Construct the prompt for barcode lookup
        prompt = f"""Look up the product associated with this UPC/barcode: {upc_clean}

Based on your knowledge, provide information about this product. If you can identify the product, return:
1. found: true if you can identify the product, false otherwise
2. name: The full product name
3. brand: The brand or manufacturer name
4. description: A brief description of the product
5. model_number: The model number if known
6. category: The product category (e.g., "Electronics", "Household", "Food", "Clothing")
7. estimated_value: The estimated current retail value in USD (just the number, no currency symbol)

Return ONLY a JSON object with these fields. Use null for any field that cannot be determined.

Example format if product is found:
{{
  "found": true,
  "name": "Wireless Bluetooth Headphones Model ABC-123",
  "brand": "Brand Name",
  "description": "Over-ear wireless headphones with noise cancellation",
  "model_number": "ABC-123",
  "category": "Electronics",
  "estimated_value": 150
}}

Example format if product is NOT found:
{{
  "found": false,
  "name": null,
  "brand": null,
  "description": null,
  "model_number": null,
  "category": null,
  "estimated_value": null
}}

Important: Only return found: true if you are reasonably confident about the product identification.
If the UPC is not in your knowledge base or you cannot identify it, return found: false."""

        # Generate the response
        response = model.generate_content(prompt)
        
        # Parse the response
        response_text = response.text
        result = parse_barcode_lookup_response(response_text)
        
        # If parsing failed or not found, include raw response
        if not result.found and not result.raw_response:
            result.raw_response = response_text
        
        return result
        
    except ImportError:
        logger.error("google-generativeai package not installed")
        raise HTTPException(
            status_code=503,
            detail="AI detection is not available. Required package not installed."
        )
    except Exception as e:
        logger.exception("Error during barcode lookup")
        error_msg = str(e)
        # Check for quota exceeded error
        if is_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=QUOTA_EXCEEDED_MESSAGE
            )
        # Don't expose internal error details
        if "API key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="AI service authentication failed. Please check GEMINI_API_KEY configuration."
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to look up barcode. Please try again."
        )


@router.post("/barcode-lookup-multi", response_model=MultiBarcodeLookupResult)
async def lookup_barcode_multi(
    request: MultiBarcodeLookupRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Look up product information using a barcode/UPC code from multiple databases.
    
    This endpoint supports the accept/reject flow:
    1. If database_id is not provided, looks up from the first enabled database in user's priority list
    2. If database_id is provided, looks up from that specific database
    3. Returns information about the next database in priority (if any) so the client can continue
    
    The flow:
    - Client calls with just UPC → gets result from first database
    - If user rejects, client calls again with next_database_id → gets result from next database
    - Continue until user accepts or no more databases
    """
    from ..upc_service import (
        lookup_upc_from_database, 
        get_next_database, 
        get_default_upc_config,
        get_available_databases
    )
    
    # Validate UPC format
    upc = request.upc.strip()
    if not upc:
        raise HTTPException(status_code=400, detail="UPC code is required.")
    
    upc_clean = re.sub(r'[\s\-]', '', upc)
    if not upc_clean.isdigit() or len(upc_clean) < MIN_UPC_LENGTH or len(upc_clean) > MAX_UPC_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid UPC code format. UPC should be {MIN_UPC_LENGTH}-{MAX_UPC_LENGTH} digits."
        )
    
    # Get user's UPC database configuration or use default
    upc_databases = current_user.upc_databases
    if upc_databases is None:
        upc_databases = get_default_upc_config()
    
    # Determine which database to query
    if request.database_id:
        # User wants a specific database (reject flow)
        db_config = next((db for db in upc_databases if db.get("id") == request.database_id), None)
        if db_config is None:
            raise HTTPException(
                status_code=400,
                detail=f"Database '{request.database_id}' not found in user configuration."
            )
        if not db_config.get("enabled", True):
            raise HTTPException(
                status_code=400,
                detail=f"Database '{request.database_id}' is disabled."
            )
        current_db_id = request.database_id
        api_key = db_config.get("api_key")
    else:
        # Get first enabled database
        db_config = get_next_database(None, upc_databases)
        if db_config is None:
            # Provide a more helpful error message by checking what's not configured
            gemini_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
            upcdatabase_configured = any(
                db.get("id") == "upcdatabase" and db.get("enabled", True) and 
                db.get("api_key") and str(db.get("api_key")).strip()
                for db in upc_databases
            )
            
            if not gemini_configured and not upcdatabase_configured:
                detail = (
                    "No UPC databases are configured and available. "
                    "Please configure an API key for UPC Database in User Settings > API & Services, "
                    "or set GEMINI_API_KEY in your environment for AI-powered lookups."
                )
            elif not upcdatabase_configured:
                detail = (
                    "UPC Database lookup requires an API key. "
                    "Please configure your API key in User Settings > API & Services > UPC Database Priority."
                )
            else:
                detail = "No UPC databases are configured and available."
            
            raise HTTPException(status_code=400, detail=detail)
        current_db_id = db_config.get("id")
        api_key = db_config.get("api_key")
    
    # Perform the lookup
    result = lookup_upc_from_database(upc_clean, current_db_id, api_key)
    
    # Determine next database in priority
    next_db_config = get_next_database(current_db_id, upc_databases)
    has_next = next_db_config is not None
    
    # Get display name for next database
    next_db_name = None
    if has_next:
        available_dbs = get_available_databases()
        next_db_info = next((db for db in available_dbs if db.get("id") == next_db_config.get("id")), None)
        next_db_name = next_db_info.get("name") if next_db_info else next_db_config.get("id")
    
    return MultiBarcodeLookupResult(
        found=result.found,
        source=result.source,
        name=result.name,
        description=result.description,
        brand=result.brand,
        model_number=result.model_number,
        estimated_value=result.estimated_value,
        estimation_date=result.estimation_date,
        category=result.category,
        raw_response=result.raw_response,
        has_next_database=has_next,
        next_database_id=next_db_config.get("id") if next_db_config else None,
        next_database_name=next_db_name
    )


@router.get("/upc-databases", response_model=schemas.AvailableUPCDatabasesResponse)
async def get_upc_databases(
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get list of available UPC databases.
    
    Returns information about all supported UPC databases that can be configured
    in user settings.
    """
    from ..upc_service import get_available_databases
    
    databases = get_available_databases()
    return schemas.AvailableUPCDatabasesResponse(
        databases=[schemas.AvailableUPCDatabase(**db) for db in databases]
    )


def parse_barcode_scan_response(response_text: str) -> BarcodeScanResult:
    """
    Parse the Gemini response text for barcode scan (reading barcode from image).
    
    The AI is prompted to return JSON with the UPC code.
    """
    result = BarcodeScanResult(found=False)
    
    try:
        # Look for JSON object in the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group()
            parsed = json.loads(json_str)
            
            if isinstance(parsed, dict):
                # Check if barcode was found - handle both boolean and string "true"/"false"
                found = parsed.get("found", False)
                result.found = found is True or (isinstance(found, str) and found.lower() == "true")
                
                if not result.found:
                    result.raw_response = response_text
                    return result
                
                # Extract UPC/barcode value
                upc = (
                    parsed.get("upc") or
                    parsed.get("barcode") or
                    parsed.get("code") or
                    parsed.get("ean") or
                    None
                )
                
                # Clean and validate the UPC using constants
                if upc:
                    # Remove any non-digit characters
                    upc_clean = re.sub(r'[^\d]', '', str(upc))
                    if upc_clean and MIN_UPC_LENGTH <= len(upc_clean) <= MAX_UPC_LENGTH:
                        result.upc = upc_clean
                    else:
                        result.found = False
                        result.raw_response = response_text
                else:
                    result.found = False
                    result.raw_response = response_text
                    
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from Gemini barcode scan response")
        result.raw_response = response_text
    
    return result


@router.post("/scan-barcode", response_model=BarcodeScanResult)
async def scan_barcode_image(
    file: UploadFile = File(..., description="Image of a barcode to scan"),
    db: Session = Depends(get_db)
):
    """
    Scan a barcode image and extract the UPC/barcode number.
    
    Uses Gemini AI to read the barcode from an uploaded image and return
    the UPC/barcode digits. This is useful for mobile devices where users
    can take a photo of a barcode to automatically fill in the UPC field.
    
    Supported barcode types:
    - UPC-A (12 digits)
    - UPC-E (6-8 digits)
    - EAN-8 (8 digits)
    - EAN-13 (13 digits)
    - GTIN-14 (14 digits)
    """
    # Check if Gemini API is configured (env or database)
    gemini_api_key = get_effective_gemini_api_key(db)
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment or configure it in the admin panel."
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    try:
        # Import Gemini SDK
        import google.generativeai as genai
        
        # Throttle requests to avoid rate limits
        throttle_ai_request()
        
        # Configure the API with effective key
        genai.configure(api_key=gemini_api_key)
        
        # Read and encode the image
        image_data = await file.read()
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Create the model
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Construct the prompt for barcode scanning
        prompt = """Analyze this image and look for any barcode or UPC code.

If you find a barcode (UPC-A, UPC-E, EAN-8, EAN-13, or similar), extract the numeric digits.

Return ONLY a JSON object with these fields:
1. found: true if a barcode is visible and readable, false otherwise
2. upc: The barcode digits (numbers only, no hyphens or spaces)

Example format if barcode is found:
{
  "found": true,
  "upc": "012345678901"
}

Example format if no barcode is found:
{
  "found": false,
  "upc": null
}

Important: 
- Only return found: true if you can clearly read the barcode digits
- Return only the numeric digits, no letters or special characters
- If the barcode is blurry or partially visible, return found: false"""

        # Create the image part for the API
        image_part = {
            "mime_type": file.content_type,
            "data": image_base64
        }
        
        # Generate the response
        response = model.generate_content([prompt, image_part])
        
        # Parse the response
        response_text = response.text
        result = parse_barcode_scan_response(response_text)
        
        # If parsing failed or not found, include raw response
        if not result.found and not result.raw_response:
            result.raw_response = response_text
        
        return result
        
    except ImportError:
        logger.error("google-generativeai package not installed")
        raise HTTPException(
            status_code=503,
            detail="AI detection is not available. Required package not installed."
        )
    except Exception as e:
        logger.exception("Error during barcode image scanning")
        error_msg = str(e)
        # Check for quota exceeded error
        if is_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=QUOTA_EXCEEDED_MESSAGE
            )
        # Don't expose internal error details
        if "API key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="AI service authentication failed. Please check GEMINI_API_KEY configuration."
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to scan barcode image. Please try again."
        )


def estimate_item_value_with_ai(item: models.Item, gemini_api_key: str) -> Optional[float]:
    """
    Use AI to estimate the value of a single item based on its details.
    Returns the estimated value in USD, or None if estimation fails.
    
    Includes request throttling to avoid rate limits on free tier.
    Raises QuotaExceededError if Gemini API quota is exceeded.
    
    Args:
        item: The item to estimate value for
        gemini_api_key: The Gemini API key to use
    """
    try:
        import google.generativeai as genai
        
        # Throttle requests to avoid rate limits
        throttle_ai_request()
        
        # Configure the API with provided key
        genai.configure(api_key=gemini_api_key)
        
        # Create the model
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Build item description for AI
        item_details = []
        if item.name:
            item_details.append(f"Name: {item.name}")
        if item.description:
            item_details.append(f"Description: {item.description}")
        if item.brand:
            item_details.append(f"Brand: {item.brand}")
        if item.model_number:
            item_details.append(f"Model: {item.model_number}")
        if item.purchase_price:
            item_details.append(f"Original purchase price: ${item.purchase_price}")
        if item.purchase_date:
            item_details.append(f"Purchase date: {item.purchase_date}")
        
        # Skip items with insufficient details for valuation
        if not item_details:
            logger.info(f"Skipping item {item.id}: no details available for valuation")
            return None
        
        item_description = "\n".join(item_details)
        
        prompt = f"""Based on the following item details, estimate its current market value in USD.
Consider factors like brand reputation, typical depreciation, and current market conditions.

{item_description}

Return ONLY a JSON object with a single field "estimated_value" containing the numeric value (no currency symbol).
Example: {{"estimated_value": 150}}

If you cannot determine a reasonable estimate, return: {{"estimated_value": null}}"""

        # Generate the response
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Parse the response with explicit JSON error handling
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                value = parsed.get("estimated_value")
                if value is not None:
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid estimated_value format for item {item.id}: {value}")
                        return None
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON response for item {item.id}: {e}")
                return None
        
        return None
        
    except Exception as e:
        # Check for quota exceeded error and re-raise as QuotaExceededError
        if is_quota_error(e):
            logger.warning(f"Gemini API quota exceeded while estimating value for item {item.id}")
            raise QuotaExceededError(QUOTA_EXCEEDED_MESSAGE)
        logger.warning(f"Failed to estimate value for item {item.id}: {e}")
        return None


def get_estimated_processing_time(item_count: int) -> str:
    """
    Calculate and format estimated processing time based on item count and throttle delay.
    
    Args:
        item_count: Number of items to process
        
    Returns:
        Human-readable string describing estimated time
    """
    delay = settings.GEMINI_REQUEST_DELAY
    if delay <= 0:
        return "a few seconds"
    
    total_seconds = item_count * delay
    
    if total_seconds < 60:
        return f"about {int(total_seconds)} seconds"
    elif total_seconds < 3600:
        minutes = int(total_seconds / 60)
        return f"about {minutes} minute{'s' if minutes > 1 else ''}"
    else:
        hours = total_seconds / 3600
        return f"about {hours:.1f} hour{'s' if hours > 1 else ''}"


@router.post("/run-valuation", response_model=schemas.AIValuationRunResponse)
async def run_ai_valuation(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run AI valuation on all items in the database.
    
    This endpoint will:
    - Skip items with user-supplied estimated values (estimated_value_user_date is set)
    - Update items with AI-generated estimated values
    - Track the estimation date
    - Stop processing if Gemini API quota is exceeded
    
    Note: Be mindful of Gemini API rate limits based on your tier level.
    See: https://ai.google.dev/gemini-api/docs/rate-limits
    """
    # Check if Gemini API is configured (env or database)
    gemini_api_key = get_effective_gemini_api_key(db)
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment or configure it in the admin panel."
        )
    
    # Get all items from the database
    items = db.query(models.Item).all()
    
    items_processed = 0
    items_updated = 0
    items_skipped = 0
    quota_exceeded = False
    
    for item in items:
        items_processed += 1
        
        # Skip items with user-supplied values
        if item.estimated_value_user_date:
            items_skipped += 1
            continue
        
        # Try to estimate the value using AI
        try:
            estimated_value = estimate_item_value_with_ai(item, gemini_api_key)
            
            if estimated_value is not None:
                item.estimated_value = estimated_value
                item.estimated_value_ai_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                items_updated += 1
        except QuotaExceededError:
            quota_exceeded = True
            logger.warning("Gemini API quota exceeded during valuation run, stopping early")
            break
    
    # Update the user's last run timestamp
    current_user.ai_schedule_last_run = datetime.now(timezone.utc)
    db.add(current_user)
    
    # Commit all changes
    db.commit()
    
    # Refresh to get the updated timestamp
    db.refresh(current_user)
    
    # Build the message based on quota status
    if quota_exceeded:
        message = (
            f"AI valuation stopped early due to rate limit. "
            f"Updated {items_updated} items, skipped {items_skipped} items with user-supplied values. "
            f"Please wait and retry later. See: https://ai.google.dev/gemini-api/docs/rate-limits"
        )
    else:
        message = f"AI valuation complete. Updated {items_updated} items, skipped {items_skipped} items with user-supplied values."
    
    return schemas.AIValuationRunResponse(
        items_processed=items_processed,
        items_updated=items_updated,
        items_skipped=items_skipped,
        message=message,
        ai_schedule_last_run=current_user.ai_schedule_last_run
    )


def enrich_item_from_data_tag_photo(
    item: models.Item, 
    photo_path: str,
    gemini_api_key: str
) -> Tuple[bool, Optional[str], Optional[str], Optional[str], Optional[float]]:
    """
    Use AI to analyze a data tag photo and extract item details.
    
    Includes request throttling to avoid rate limits on free tier.
    Returns a tuple of (success, brand, model_number, serial_number, estimated_value).
    Raises QuotaExceededError if Gemini API quota is exceeded.
    
    Args:
        item: The item to enrich
        photo_path: Path to the data tag photo
        gemini_api_key: The Gemini API key to use
    """
    try:
        import google.generativeai as genai
        
        # Resolve the photo path
        # Photos are stored with paths like "/uploads/photos/filename.jpg"
        # The actual file is at "/app/data/media/photos/filename.jpg"
        if photo_path.startswith("/uploads/"):
            actual_path = Path("/app/data/media") / photo_path.replace("/uploads/", "")
        else:
            actual_path = Path(photo_path)
        
        if not actual_path.exists():
            logger.warning(f"Data tag photo not found at {actual_path}")
            return False, None, None, None, None
        
        # Throttle requests to avoid rate limits
        throttle_ai_request()
        
        # Configure the API with provided key
        genai.configure(api_key=gemini_api_key)
        
        # Create the model
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Read and encode the image
        with open(actual_path, "rb") as f:
            image_data = f.read()
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Determine MIME type from file extension
        ext = actual_path.suffix.lower()
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", 
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        mime_type = mime_types.get(ext, "image/jpeg")
        
        prompt = """Analyze this image of a product data tag, label, or identification plate.

Extract the following information if visible:
1. brand: The brand or manufacturer name
2. model_number: The model number or part number
3. serial_number: The serial number (S/N)
4. estimated_value: Based on the brand, model, and product type, estimate the current market/replacement value in USD (just the number)

Return ONLY a JSON object with these fields. Use null for any field that cannot be determined.

Example format:
{
  "brand": "Samsung",
  "model_number": "UN55TU8000FXZA",
  "serial_number": "ABC123456789",
  "estimated_value": 450
}"""

        image_part = {
            "mime_type": mime_type,
            "data": image_base64
        }
        
        response = model.generate_content([prompt, image_part])
        response_text = response.text
        
        # Parse the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                
                brand = parsed.get("brand") or parsed.get("manufacturer")
                model_number = parsed.get("model_number") or parsed.get("model")
                serial_number = parsed.get("serial_number") or parsed.get("serial")
                
                estimated_value = None
                value_str = parsed.get("estimated_value") or parsed.get("value")
                if value_str:
                    try:
                        if isinstance(value_str, (int, float)):
                            estimated_value = float(value_str)
                        else:
                            clean_value = re.sub(r'[^\d.]', '', str(value_str))
                            if clean_value:
                                estimated_value = float(clean_value)
                    except (ValueError, TypeError):
                        pass
                
                return True, brand, model_number, serial_number, estimated_value
                
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON response: {e}")
                return False, None, None, None, None
        
        return False, None, None, None, None
        
    except Exception as e:
        # Check for quota exceeded error and re-raise
        if is_quota_error(e):
            logger.warning("Gemini API quota exceeded during data tag enrichment")
            raise QuotaExceededError(QUOTA_EXCEEDED_MESSAGE)
        logger.warning(f"Failed to enrich item from data tag: {e}")
        return False, None, None, None, None


@router.post("/enrich-from-data-tags", response_model=schemas.AIEnrichmentRunResponse)
async def enrich_items_from_data_tags(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scan all items for data tag photos and use AI to extract missing details.
    
    This endpoint will:
    - Find items that have data tag photos
    - Skip items that already have complete details (brand, model, serial, and estimated value)
    - Use AI to analyze data tag photos and extract details
    - Update items with extracted information
    - Stop if Gemini API quota is exceeded and report progress
    
    This is useful for:
    - Filling in missing details after bulk imports
    - Enriching items that were imported without AI due to quota limits
    
    Note: Be mindful of Gemini API rate limits based on your tier level.
    See: https://ai.google.dev/gemini-api/docs/rate-limits
    """
    # Check if Gemini API is configured (env or database)
    gemini_api_key = get_effective_gemini_api_key(db)
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment or configure it in the admin panel."
        )
    
    # Get all items with data tag photos
    items_with_data_tags = (
        db.query(models.Item)
        .join(models.Photo, models.Item.id == models.Photo.item_id)
        .filter(models.Photo.is_data_tag.is_(True))
        .distinct()
        .all()
    )
    
    items_processed = 0
    items_updated = 0
    items_skipped = 0
    quota_exceeded = False
    
    for item in items_with_data_tags:
        items_processed += 1
        
        # Check if item already has complete details
        has_brand = bool(item.brand)
        has_model = bool(item.model_number)
        has_serial = bool(item.serial_number)
        has_value = item.estimated_value is not None
        
        # Skip if all details are already present
        if has_brand and has_model and has_serial and has_value:
            items_skipped += 1
            continue
        
        # Find data tag photos for this item
        data_tag_photos = [p for p in item.photos if p.is_data_tag]
        if not data_tag_photos:
            items_skipped += 1
            continue
        
        # Try to enrich from data tag photos
        for photo in data_tag_photos:
            try:
                success, brand, model_number, serial_number, estimated_value = enrich_item_from_data_tag_photo(
                    item, photo.path, gemini_api_key
                )
                
                if success:
                    updated = False
                    
                    # Only update fields that are currently empty
                    if not has_brand and brand:
                        item.brand = brand
                        updated = True
                    if not has_model and model_number:
                        item.model_number = model_number
                        updated = True
                    if not has_serial and serial_number:
                        item.serial_number = serial_number
                        updated = True
                    if not has_value and estimated_value is not None:
                        item.estimated_value = estimated_value
                        item.estimated_value_ai_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                        updated = True
                    
                    if updated:
                        items_updated += 1
                        break  # Stop after successful enrichment from one photo
                        
            except QuotaExceededError:
                quota_exceeded = True
                logger.warning("Gemini API quota exceeded during enrichment, stopping early")
                break
        
        if quota_exceeded:
            break
    
    # Commit all changes
    db.commit()
    
    # Build the message based on quota status
    if quota_exceeded:
        message = (
            f"AI enrichment stopped early due to rate limit. "
            f"Processed {items_processed} items with data tags, updated {items_updated}, skipped {items_skipped}. "
            f"Please wait and retry later. See: https://ai.google.dev/gemini-api/docs/rate-limits"
        )
    else:
        message = (
            f"AI enrichment complete. "
            f"Processed {items_processed} items with data tags, updated {items_updated}, skipped {items_skipped} (already complete)."
        )
    
    return schemas.AIEnrichmentRunResponse(
        items_processed=items_processed,
        items_updated=items_updated,
        items_skipped=items_skipped,
        items_with_data_tags=len(items_with_data_tags),
        quota_exceeded=quota_exceeded,
        message=message
    )
