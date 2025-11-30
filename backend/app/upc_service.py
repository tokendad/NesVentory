"""
UPC Lookup Service

Provides a unified interface for looking up product information from multiple UPC databases.
Supports configurable database priority and user-specific API keys.

Available databases:
- Gemini AI: Uses Google's Gemini AI to identify products from UPC codes
- UPC Database: External API at upcdatabase.org for UPC lookups
"""

import logging
import re
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, List
from dataclasses import dataclass
from abc import ABC, abstractmethod

from .config import settings

logger = logging.getLogger(__name__)


@dataclass
class UPCLookupResult:
    """Result from a UPC database lookup."""
    found: bool
    source: str  # The database that returned this result (e.g., 'gemini', 'upcdatabase')
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    estimated_value: Optional[float] = None
    estimation_date: Optional[str] = None
    category: Optional[str] = None
    raw_response: Optional[str] = None


# Available UPC database definitions
AVAILABLE_UPC_DATABASES = [
    {
        "id": "gemini",
        "name": "Gemini AI",
        "description": "Google's Gemini AI for intelligent product identification",
        "requires_api_key": False,  # Uses global GEMINI_API_KEY from environment
        "api_key_url": None
    },
    {
        "id": "upcdatabase",
        "name": "UPC Database",
        "description": "upcdatabase.org - Free UPC lookup database",
        "requires_api_key": True,
        "api_key_url": "https://upcdatabase.org/api"
    }
]


def get_available_databases() -> List[dict]:
    """Get list of available UPC databases with their configuration info."""
    return AVAILABLE_UPC_DATABASES


def get_default_upc_config() -> List[dict]:
    """Get the default UPC database configuration for new users."""
    # Default: Gemini first (if configured), then UPC Database
    return [
        {"id": "gemini", "enabled": True, "api_key": None},
        {"id": "upcdatabase", "enabled": True, "api_key": None}
    ]


class UPCDatabase(ABC):
    """Abstract base class for UPC database implementations."""
    
    @abstractmethod
    def lookup(self, upc: str) -> UPCLookupResult:
        """Look up product information by UPC code."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the database is properly configured and available."""
        pass


class GeminiUPCDatabase(UPCDatabase):
    """UPC lookup using Google's Gemini AI."""
    
    def __init__(self):
        self._last_request_time = 0.0
    
    def is_available(self) -> bool:
        """Check if Gemini API is configured."""
        return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    
    def _throttle(self):
        """Throttle requests to avoid rate limits."""
        import time
        
        delay = settings.GEMINI_REQUEST_DELAY
        if delay <= 0:
            return
        
        current_time = time.time()
        elapsed = current_time - self._last_request_time
        
        if elapsed < delay:
            sleep_time = delay - elapsed
            logger.debug(f"Throttling Gemini request: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self._last_request_time = time.time()
    
    def lookup(self, upc: str) -> UPCLookupResult:
        """Look up product using Gemini AI."""
        if not self.is_available():
            return UPCLookupResult(found=False, source="gemini", raw_response="Gemini API not configured")
        
        try:
            import google.generativeai as genai
            
            self._throttle()
            
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            
            prompt = f"""Look up the product associated with this UPC/barcode: {upc}

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

            response = model.generate_content(prompt)
            response_text = response.text
            
            return self._parse_response(response_text)
            
        except Exception as e:
            logger.exception("Error during Gemini UPC lookup")
            return UPCLookupResult(
                found=False,
                source="gemini",
                raw_response=f"Error: {str(e)}"
            )
    
    def _parse_response(self, response_text: str) -> UPCLookupResult:
        """Parse the Gemini response text."""
        result = UPCLookupResult(found=False, source="gemini")
        
        try:
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                parsed = json.loads(json_match.group())
                
                if isinstance(parsed, dict):
                    found = parsed.get("found", False)
                    if found is True or (isinstance(found, str) and found.lower() == "true"):
                        result.found = True
                    else:
                        result.raw_response = response_text
                        return result
                    
                    result.name = parsed.get("name") or parsed.get("product_name") or parsed.get("title")
                    result.description = parsed.get("description") or parsed.get("product_description")
                    result.brand = parsed.get("brand") or parsed.get("manufacturer")
                    result.model_number = parsed.get("model_number") or parsed.get("model")
                    result.category = parsed.get("category") or parsed.get("product_category")
                    
                    # Parse estimated value
                    value_str = parsed.get("estimated_value") or parsed.get("value") or parsed.get("price")
                    if value_str:
                        try:
                            if isinstance(value_str, (int, float)):
                                result.estimated_value = float(value_str)
                            else:
                                clean_value = re.sub(r'[^\d.]', '', str(value_str))
                                if clean_value:
                                    result.estimated_value = float(clean_value)
                        except (ValueError, TypeError):
                            pass
                    
                    if result.estimated_value is not None:
                        result.estimation_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
                        
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from Gemini response")
            result.raw_response = response_text
        
        return result


class UPCDatabaseOrg(UPCDatabase):
    """UPC lookup using upcdatabase.org API."""
    
    BASE_URL = "https://api.upcdatabase.org/product"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    def is_available(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key and self.api_key.strip())
    
    def lookup(self, upc: str) -> UPCLookupResult:
        """Look up product using upcdatabase.org API."""
        if not self.is_available():
            return UPCLookupResult(
                found=False, 
                source="upcdatabase", 
                raw_response="API key not configured for upcdatabase.org"
            )
        
        try:
            url = f"{self.BASE_URL}/{upc}"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json"
            }
            
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url, headers=headers)
            
            if response.status_code == 404:
                return UPCLookupResult(
                    found=False,
                    source="upcdatabase",
                    raw_response="Product not found in upcdatabase.org"
                )
            
            if response.status_code != 200:
                return UPCLookupResult(
                    found=False,
                    source="upcdatabase",
                    raw_response=f"API error: HTTP {response.status_code}"
                )
            
            data = response.json()
            return self._parse_response(data)
            
        except httpx.TimeoutException:
            logger.warning("Timeout during upcdatabase.org lookup")
            return UPCLookupResult(
                found=False,
                source="upcdatabase",
                raw_response="Request timeout"
            )
        except Exception as e:
            logger.exception("Error during upcdatabase.org UPC lookup")
            return UPCLookupResult(
                found=False,
                source="upcdatabase",
                raw_response=f"Error: {str(e)}"
            )
    
    def _parse_response(self, data: dict) -> UPCLookupResult:
        """Parse the upcdatabase.org API response."""
        result = UPCLookupResult(found=False, source="upcdatabase")
        
        # Check if the response indicates success
        if not data.get("success", False):
            result.raw_response = json.dumps(data)
            return result
        
        result.found = True
        result.name = data.get("title")
        result.description = data.get("description")
        result.brand = data.get("brand")
        result.model_number = data.get("model")
        result.category = data.get("category")
        
        # UPC Database doesn't provide estimated values
        # but we can return any price information if available
        
        return result


def get_database_instance(db_id: str, api_key: Optional[str] = None) -> Optional[UPCDatabase]:
    """
    Get an instance of a UPC database by its ID.
    
    Args:
        db_id: The database identifier (e.g., 'gemini', 'upcdatabase')
        api_key: Optional API key for databases that require one
        
    Returns:
        A UPCDatabase instance or None if the database ID is unknown
    """
    if db_id == "gemini":
        return GeminiUPCDatabase()
    elif db_id == "upcdatabase":
        return UPCDatabaseOrg(api_key=api_key)
    else:
        logger.warning(f"Unknown UPC database ID: {db_id}")
        return None


def lookup_upc(
    upc: str,
    upc_databases: Optional[List[dict]] = None
) -> UPCLookupResult:
    """
    Look up a UPC code using the configured databases in priority order.
    
    This is a simple lookup that returns the first successful result.
    For the interactive flow with accept/reject, use lookup_upc_next().
    
    Args:
        upc: The UPC code to look up
        upc_databases: User's database configuration (ordered by priority)
                      If None, uses default configuration
        
    Returns:
        UPCLookupResult from the first database that finds the product,
        or a not-found result if no database finds it
    """
    # Validate UPC format
    upc_clean = re.sub(r'[\s\-]', '', upc)
    if not upc_clean.isdigit() or len(upc_clean) < 6 or len(upc_clean) > 14:
        return UPCLookupResult(
            found=False,
            source="validation",
            raw_response="Invalid UPC code format. UPC should be 6-14 digits."
        )
    
    # Use default config if none provided
    if upc_databases is None:
        upc_databases = get_default_upc_config()
    
    # Try each enabled database in priority order
    for db_config in upc_databases:
        if not db_config.get("enabled", True):
            continue
        
        db_id = db_config.get("id")
        api_key = db_config.get("api_key")
        
        database = get_database_instance(db_id, api_key)
        if database is None:
            continue
        
        if not database.is_available():
            logger.debug(f"UPC database {db_id} is not available")
            continue
        
        logger.info(f"Looking up UPC {upc_clean} in {db_id}")
        result = database.lookup(upc_clean)
        
        if result.found:
            return result
    
    # No database found the product
    return UPCLookupResult(
        found=False,
        source="none",
        raw_response="Product not found in any configured database"
    )


def lookup_upc_from_database(
    upc: str,
    db_id: str,
    api_key: Optional[str] = None
) -> UPCLookupResult:
    """
    Look up a UPC code from a specific database.
    
    This is used for the accept/reject flow where we need to query
    one database at a time.
    
    Args:
        upc: The UPC code to look up
        db_id: The database identifier to query
        api_key: Optional API key for the database
        
    Returns:
        UPCLookupResult from the specified database
    """
    # Validate UPC format
    upc_clean = re.sub(r'[\s\-]', '', upc)
    if not upc_clean.isdigit() or len(upc_clean) < 6 or len(upc_clean) > 14:
        return UPCLookupResult(
            found=False,
            source="validation",
            raw_response="Invalid UPC code format. UPC should be 6-14 digits."
        )
    
    database = get_database_instance(db_id, api_key)
    if database is None:
        return UPCLookupResult(
            found=False,
            source=db_id,
            raw_response=f"Unknown database: {db_id}"
        )
    
    if not database.is_available():
        return UPCLookupResult(
            found=False,
            source=db_id,
            raw_response=f"Database {db_id} is not available (check configuration)"
        )
    
    return database.lookup(upc_clean)


def get_next_database(
    current_db_id: Optional[str],
    upc_databases: Optional[List[dict]] = None
) -> Optional[dict]:
    """
    Get the next enabled database in the priority order after the current one.
    
    Args:
        current_db_id: ID of the current database, or None to get the first
        upc_databases: User's database configuration
        
    Returns:
        The next database config dict, or None if no more databases
    """
    if upc_databases is None:
        upc_databases = get_default_upc_config()
    
    found_current = current_db_id is None
    
    for db_config in upc_databases:
        if not db_config.get("enabled", True):
            continue
        
        db_id = db_config.get("id")
        
        if found_current:
            # Check if this database is available
            database = get_database_instance(db_id, db_config.get("api_key"))
            if database and database.is_available():
                return db_config
        elif db_id == current_db_id:
            found_current = True
    
    return None
