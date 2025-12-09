"""
Plugin service for calling external LLM plugins.

Handles communication with external AI plugins for item detection and identification.
"""

import logging
import httpx
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from . import models

logger = logging.getLogger(__name__)

# Timeout for plugin API calls (in seconds)
PLUGIN_TIMEOUT = 30.0

# Timeout for plugin connection tests (in seconds)
PLUGIN_TEST_TIMEOUT = 10.0


def get_enabled_plugins(
    db: Session,
    requires_image_processing: bool = False
) -> List[models.Plugin]:
    """
    Get all enabled plugins ordered by priority (lower = higher priority).
    
    Args:
        db: Database session
        requires_image_processing: If True, only return plugins that support image processing
    
    Returns:
        List of enabled plugins ordered by priority
    """
    query = db.query(models.Plugin).filter(models.Plugin.enabled.is_(True))
    
    if requires_image_processing:
        query = query.filter(models.Plugin.supports_image_processing.is_(True))
    
    return query.order_by(models.Plugin.priority).all()


async def call_plugin_identify_image(
    plugin: models.Plugin,
    image_data: bytes,
    content_type: str
) -> Optional[dict]:
    """
    Call a plugin's /nesventory/identify/image endpoint.
    
    Args:
        plugin: Plugin model instance
        image_data: Image bytes to send
        content_type: MIME type of the image
    
    Returns:
        Plugin response as dict, or None if the call failed
    """
    try:
        # Build the full endpoint URL
        base_url = plugin.endpoint_url.rstrip('/')
        url = f"{base_url}/nesventory/identify/image"
        
        # Prepare headers
        headers = {}
        if plugin.api_key:
            headers["Authorization"] = f"Bearer {plugin.api_key}"
        
        # Prepare the multipart file upload
        files = {
            "file": ("image", image_data, content_type)
        }
        
        # Make the API call
        async with httpx.AsyncClient(timeout=PLUGIN_TIMEOUT) as client:
            response = await client.post(url, files=files, headers=headers)
            
            # Check if request was successful
            if response.status_code == 200:
                logger.info(f"Plugin '{plugin.name}' responded successfully")
                return response.json()
            else:
                logger.warning(
                    f"Plugin '{plugin.name}' returned status {response.status_code}: {response.text}"
                )
                return None
                
    except httpx.TimeoutException:
        logger.warning(f"Plugin '{plugin.name}' timed out after {PLUGIN_TIMEOUT}s")
        return None
    except Exception as e:
        logger.warning(f"Error calling plugin '{plugin.name}': {e}")
        return None


async def try_plugins_for_image_detection(
    db: Session,
    image_data: bytes,
    content_type: str
) -> Tuple[Optional[dict], Optional[str]]:
    """
    Try all enabled plugins for image detection in priority order.
    
    Args:
        db: Database session
        image_data: Image bytes to send
        content_type: MIME type of the image
    
    Returns:
        Tuple of (plugin_response_dict, plugin_name) if successful, or (None, None) if all failed
    """
    plugins = get_enabled_plugins(db, requires_image_processing=True)
    
    if not plugins:
        logger.debug("No enabled plugins found for image processing")
        return None, None
    
    logger.info(f"Trying {len(plugins)} enabled plugin(s) for image detection")
    
    for plugin in plugins:
        logger.debug(f"Trying plugin '{plugin.name}' (priority {plugin.priority})")
        
        result = await call_plugin_identify_image(plugin, image_data, content_type)
        
        if result:
            logger.info(f"Plugin '{plugin.name}' successfully identified items")
            return result, plugin.name
    
    logger.info("All plugins failed or returned no results")
    return None, None


def test_plugin_connection(plugin: models.Plugin) -> dict:
    """
    Test connection to a plugin by calling its /health or /connection/test endpoint.
    
    Args:
        plugin: Plugin model instance
    
    Returns:
        Dict with connection test results
    """
    try:
        base_url = plugin.endpoint_url.rstrip('/')
        
        # Try /connection/test endpoint first (more detailed)
        test_url = f"{base_url}/connection/test"
        
        headers = {}
        if plugin.api_key:
            headers["Authorization"] = f"Bearer {plugin.api_key}"
        
        with httpx.Client(timeout=PLUGIN_TEST_TIMEOUT) as client:
            try:
                response = client.get(test_url, headers=headers)
                if response.status_code == 200:
                    return {
                        "success": True,
                        "status_code": response.status_code,
                        "endpoint": test_url,
                        "details": response.json()
                    }
            except Exception:
                # Fall back to /health endpoint
                pass
            
            # Try /health endpoint as fallback
            health_url = f"{base_url}/health"
            response = client.get(health_url, headers=headers)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "endpoint": health_url,
                    "details": response.json()
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "endpoint": health_url,
                    "error": response.text
                }
                
    except httpx.TimeoutException:
        return {
            "success": False,
            "error": f"Connection timeout after {PLUGIN_TEST_TIMEOUT} seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
