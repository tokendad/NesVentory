"""
Plugin service for calling custom LLM endpoints.

Provides functionality to interact with custom LLM plugins for AI operations.
"""

import logging
import httpx
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse
from sqlalchemy.orm import Session

from . import models

logger = logging.getLogger(__name__)


def _is_localhost_url(url: str) -> bool:
    """
    Check if a URL refers to localhost or loopback address.
    
    Args:
        url: The URL to check
        
    Returns:
        True if the URL uses localhost, 127.0.0.1, or ::1 (IPv6 localhost), False otherwise
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ''
        return hostname.lower() in ('localhost', '127.0.0.1', '::1')
    except Exception:
        # Fallback to simple string matching if URL parsing fails
        url_lower = url.lower()
        return 'localhost' in url_lower or '127.0.0.1' in url


def get_enabled_ai_scan_plugins(db: Session, requires_image_processing: bool = False) -> List[models.Plugin]:
    """
    Get all enabled plugins that are configured for AI scan operations.
    
    Args:
        db: Database session
        requires_image_processing: If True, only return plugins that support image processing
    
    Returns plugins ordered by priority (lower priority number = higher priority).
    """
    query = db.query(models.Plugin).filter(
        models.Plugin.enabled.is_(True),
        models.Plugin.use_for_ai_scan.is_(True)
    )
    
    if requires_image_processing:
        query = query.filter(models.Plugin.supports_image_processing.is_(True))
    
    plugins = query.order_by(models.Plugin.priority).all()
    
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


async def detect_items_with_plugin(
    plugin: models.Plugin,
    image_data: bytes,
    mime_type: str
) -> Optional[Dict[str, Any]]:
    """
    Detect items in an image using a custom LLM plugin.
    
    Args:
        plugin: The Plugin model instance
        image_data: The image bytes
        mime_type: The MIME type of the image
        
    Returns:
        Detection result with items array, or None if detection failed
    """
    try:
        # Prepare the files dict for multipart upload
        files = {
            'file': ('image', image_data, mime_type)
        }
        
        # Call the plugin endpoint
        result = await call_plugin_endpoint(
            plugin,
            '/detect-items',
            files=files,
            timeout=60.0  # Item detection might take longer
        )
        
        logger.info(f"Successfully detected items using plugin: {plugin.name}")
        return result
        
    except Exception as e:
        logger.error(f"Error detecting items with plugin {plugin.name}: {e}")
        return None


async def test_plugin_connection(plugin: models.Plugin) -> Dict[str, Any]:
    """
    Test the connection to a plugin by calling a health check endpoint.
    
    Args:
        plugin: The Plugin model instance to test
        
    Returns:
        A dictionary with:
        - 'success': bool indicating if the connection test succeeded
        - 'message': str with success/error message
        - 'status_code': int HTTP status code (if available)
    """
    try:
        # Construct the health check URL
        base_url = plugin.endpoint_url.rstrip('/')
        url = f"{base_url}/health"
        
        # Prepare headers
        headers = {}
        if plugin.api_key:
            headers['Authorization'] = f'Bearer {plugin.api_key}'
        
        # Make the request with a shorter timeout for connection tests
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
            # Check if the response is successful
            if response.status_code == 200:
                logger.info(f"Connection test successful for plugin: {plugin.name}")
                return {
                    'success': True,
                    'message': 'Connection successful',
                    'status_code': response.status_code
                }
            else:
                logger.warning(f"Connection test failed for plugin {plugin.name}: HTTP {response.status_code}")
                return {
                    'success': False,
                    'message': f'Received HTTP {response.status_code}',
                    'status_code': response.status_code
                }
                
    except httpx.TimeoutException:
        logger.error(f"Connection test timed out for plugin: {plugin.name}")
        
        # Check if using localhost - common Docker networking mistake
        if _is_localhost_url(plugin.endpoint_url):
            return {
                'success': False,
                'message': 'Connection timed out. NOTE: If running in Docker, "localhost" refers to the container itself. Use the host machine IP (e.g., "http://192.168.1.100:8002"), container name, or "host.docker.internal" on Docker Desktop.',
                'status_code': None
            }
        
        return {
            'success': False,
            'message': 'Connection timed out after 10 seconds',
            'status_code': None
        }
    except httpx.ConnectError as e:
        logger.error(f"Connection error testing plugin {plugin.name}: {e}")
        
        error_str = str(e)
        
        # Check for DNS resolution failure (common when containers are on different networks)
        if 'name resolution' in error_str.lower() or 'errno -3' in error_str.lower():
            return {
                'success': False,
                'message': f'Cannot resolve hostname: {error_str}. The containers may be on different Docker networks. Solutions: (1) Use host machine IP like "http://192.168.1.100:8002", (2) Use "docker network connect" to connect both containers to the same network, (3) Use "host.docker.internal" (Docker Desktop)',
                'status_code': None
            }
        
        # Check if using localhost - common Docker networking mistake
        if _is_localhost_url(plugin.endpoint_url):
            return {
                'success': False,
                'message': f'Connection failed: {error_str}. NOTE: If running in Docker, "localhost" refers to the container itself. Use the host machine IP (e.g., "http://192.168.1.100:8002") instead. Run "ip addr" or "ifconfig" to find your IP.',
                'status_code': None
            }
        
        return {
            'success': False,
            'message': f'Connection failed: {error_str}',
            'status_code': None
        }
    except Exception as e:
        logger.error(f"Unexpected error testing plugin {plugin.name}: {e}")
        return {
            'success': False,
            'message': f'Error: {str(e)}',
            'status_code': None
        }
