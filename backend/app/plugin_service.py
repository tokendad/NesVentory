"""
Plugin service for calling custom LLM endpoints.

Provides functionality to interact with custom LLM plugins for AI operations.
"""

import logging
import httpx
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from . import models

logger = logging.getLogger(__name__)


def get_enabled_ai_scan_plugins(db: Session) -> List[models.Plugin]:
    """
    Get all enabled plugins that are configured for AI scan operations.
    
    Returns plugins ordered by priority (lower priority number = higher priority).
    """
    plugins = db.query(models.Plugin).filter(
        models.Plugin.enabled.is_(True),
        models.Plugin.use_for_ai_scan.is_(True)
    ).order_by(models.Plugin.priority).all()
    
    return plugins


async def call_plugin_endpoint(
    plugin: models.Plugin,
    endpoint_path: str,
    data: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0
) -> Dict[str, Any]:
    """
    Call a plugin endpoint with the provided data.
    
    Args:
        plugin: The Plugin model instance
        endpoint_path: The path to append to the plugin's endpoint URL (e.g., "/parse-data-tag")
        data: JSON data to send in the request body
        files: Files to upload (for multipart/form-data)
        timeout: Request timeout in seconds
        
    Returns:
        The JSON response from the plugin endpoint
        
    Raises:
        httpx.HTTPError: If the request fails
    """
    # Construct the full URL
    base_url = plugin.endpoint_url.rstrip('/')
    url = f"{base_url}{endpoint_path}"
    
    # Prepare headers
    headers = {}
    if plugin.api_key:
        headers['Authorization'] = f'Bearer {plugin.api_key}'
    
    # Make the request
    async with httpx.AsyncClient(timeout=timeout) as client:
        if files:
            # Multipart request with files
            response = await client.post(url, headers=headers, data=data or {}, files=files)
        else:
            # JSON request
            if data:
                headers['Content-Type'] = 'application/json'
            response = await client.post(url, headers=headers, json=data)
        
        response.raise_for_status()
        return response.json()


async def parse_data_tag_with_plugin(
    plugin: models.Plugin,
    image_data: bytes,
    mime_type: str
) -> Optional[Dict[str, Any]]:
    """
    Parse a data tag image using a custom LLM plugin.
    
    Args:
        plugin: The Plugin model instance
        image_data: The image bytes
        mime_type: The MIME type of the image
        
    Returns:
        Parsed data tag information as a dict, or None if parsing failed
    """
    try:
        # Prepare the files dict for multipart upload
        files = {
            'file': ('image', image_data, mime_type)
        }
        
        # Call the plugin endpoint
        result = await call_plugin_endpoint(
            plugin,
            '/parse-data-tag',
            files=files,
            timeout=60.0  # Data tag parsing might take longer
        )
        
        logger.info(f"Successfully parsed data tag using plugin: {plugin.name}")
        return result
        
    except Exception as e:
        logger.error(f"Error parsing data tag with plugin {plugin.name}: {e}")
        return None


async def lookup_barcode_with_plugin(
    plugin: models.Plugin,
    barcode: str
) -> Optional[Dict[str, Any]]:
    """
    Look up a barcode/UPC using a custom LLM plugin.
    
    Args:
        plugin: The Plugin model instance
        barcode: The barcode/UPC to look up
        
    Returns:
        Barcode lookup information as a dict, or None if lookup failed
    """
    try:
        # Prepare the data
        data = {
            'barcode': barcode,
            'upc': barcode  # Support both field names
        }
        
        # Call the plugin endpoint
        result = await call_plugin_endpoint(
            plugin,
            '/lookup-barcode',
            data=data,
            timeout=30.0
        )
        
        logger.info(f"Successfully looked up barcode using plugin: {plugin.name}")
        return result
        
    except Exception as e:
        logger.error(f"Error looking up barcode with plugin {plugin.name}: {e}")
        return None
