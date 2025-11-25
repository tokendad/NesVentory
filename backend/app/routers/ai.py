"""
AI-powered image analysis router.

Uses Google Gemini to detect and identify items in photos.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import base64
import json
import logging
import re

from ..config import settings
from ..deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

# Allowed image types for AI analysis
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]


class DetectedItem(BaseModel):
    """Schema for a detected item from AI analysis."""
    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    estimated_value: Optional[float] = None
    confidence: Optional[float] = None


class DetectionResult(BaseModel):
    """Schema for the AI detection response."""
    items: List[DetectedItem]
    raw_response: Optional[str] = None


class AIStatusResponse(BaseModel):
    """Schema for AI feature status."""
    enabled: bool
    model: Optional[str] = None


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
                        
                        items.append(DetectedItem(
                            name=name,
                            description=description,
                            brand=brand,
                            estimated_value=estimated_value,
                            confidence=confidence
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
                    items.append(DetectedItem(
                        name=parsed.get("name", "Unknown Item"),
                        description=parsed.get("description"),
                        brand=parsed.get("brand"),
                        estimated_value=None,
                        confidence=None
                    ))
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from Gemini response")
    
    # If no items parsed, try to extract item names from plain text
    if not items:
        # Split by common delimiters and look for item-like entries
        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and len(line) > 2 and len(line) < 100:
                # Skip lines that look like headers or instructions
                if any(skip in line.lower() for skip in ['here are', 'detected', 'found', 'items:', 'list']):
                    continue
                # Remove common prefixes like "- ", "* ", "1. "
                cleaned = re.sub(r'^[-*•]\s*', '', line)
                cleaned = re.sub(r'^\d+[.)\s]+', '', cleaned)
                if cleaned and len(cleaned) > 2:
                    items.append(DetectedItem(name=cleaned))
    
    return items


@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    """
    Check if AI detection feature is enabled and configured.
    """
    is_enabled = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    return AIStatusResponse(
        enabled=is_enabled,
        model=settings.GEMINI_MODEL if is_enabled else None
    )


@router.post("/detect-items", response_model=DetectionResult)
async def detect_items(
    file: UploadFile = File(..., description="Image file to analyze for items"),
    db: Session = Depends(get_db)
):
    """
    Analyze an uploaded image using AI to detect household items.
    
    Returns a list of detected items with names, descriptions, and estimated values.
    These can be used to create inventory items.
    """
    # Check if Gemini API is configured
    if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
        raise HTTPException(
            status_code=503,
            detail="AI detection is not configured. Please set GEMINI_API_KEY in environment."
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
        
        # Configure the API
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
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
