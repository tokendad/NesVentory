from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, Set
from uuid import UUID
from urllib.parse import urlparse
import ipaddress
from publicsuffix2 import get_sld
import io

import logging
from pathlib import Path
from datetime import datetime
from .. import models, schemas
from ..deps import get_db
from ..storage import get_storage
from ..config import settings
import httpx
import socket


def get_allowed_hosts() -> Set[str]:
    """Parse DOCUMENT_URL_ALLOWED_HOSTS from config into a set of lowercase hostnames."""
    hosts_str = settings.DOCUMENT_URL_ALLOWED_HOSTS
    if not hosts_str or hosts_str.strip() == "":
        return set()
    return {h.strip().lower() for h in hosts_str.split(",") if h.strip()}


def is_host_allowed(hostname: str) -> bool:
    """
    Check if hostname is allowed for document URL downloads.

    Security note: This is an additional layer on top of SSRF IP protection.
    Even when host validation is disabled, private/loopback/link-local IPs are still blocked.
    """
    # If host validation is disabled, allow all public hosts
    if not settings.DOCUMENT_URL_HOST_VALIDATION:
        return True

    # Get configured allowed hosts
    allowed_hosts = get_allowed_hosts()

    # If no hosts are configured and validation is enabled, allow all
    # (to maintain backwards compatibility and avoid breaking existing setups)
    if not allowed_hosts:
        return True

    # Canonicalize hostname
    canonical_hostname = hostname.rstrip('.').lower()

    # Check exact hostname match
    if canonical_hostname in allowed_hosts:
        return True

    # Check second-level domain (e.g., "files.example.com" matches "example.com")
    try:
        sld = get_sld(canonical_hostname)
        if sld and sld in allowed_hosts:
            return True
    except Exception:
        pass

    return False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/items", tags=["documents"])


# Allowed file types for document uploads (PDF and TXT)
ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain"]

# Map MIME types to safe extensions
MIME_TYPE_EXTENSION = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
}


@router.post("/{item_id}/documents", response_model=schemas.Document, status_code=status.HTTP_201_CREATED)
async def upload_document(
    item_id: UUID,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a document (PDF or TXT) for an item."""
    # Verify item exists
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: PDF, TXT"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_extension = MIME_TYPE_EXTENSION.get(file.content_type, ".pdf")
    # Use original filename as base, with timestamp for uniqueness
    original_name = Path(file.filename).stem if file.filename else "document"
    # Sanitize the original name to avoid path traversal - only allow alphanumeric, underscore, and hyphen
    safe_name = "".join(c for c in original_name if c.isalnum() or c in ('_', '-'))[:100]
    if not safe_name:
        safe_name = "document"
    filename = f"{item_id}_{timestamp}_{safe_name}{file_extension}"
    storage_path = f"documents/{filename}"
    
    # Save file using storage backend
    storage = get_storage()
    try:
        file_url = storage.save(file.file, storage_path, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create document record
    document = models.Document(
        item_id=item_id,
        filename=file.filename or filename,
        path=file_url,
        mime_type=file.content_type,
        document_type=document_type
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document


@router.delete("/{item_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    item_id: UUID,
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a document."""
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.item_id == item_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from storage
    storage = get_storage()
    from ..storage import extract_storage_path
    try:
        storage_path = extract_storage_path(document.path, "documents")
        storage.delete(storage_path)
    except Exception as e:
        logger.warning(f"Failed to delete document file: {e}")
    
    db.delete(document)
    db.commit()
    return None


@router.post("/{item_id}/documents/from-url", response_model=schemas.Document, status_code=status.HTTP_201_CREATED)
async def upload_document_from_url(
    item_id: UUID,
    url: str = Form(...),
    document_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a document (PDF or TXT) from a URL for an item."""
    # Verify item exists
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Validate and parse URL
    try:
        parsed_url = urlparse(url)
        
        # Security: Only allow HTTP and HTTPS schemes
        if parsed_url.scheme not in ("http", "https"):
            raise HTTPException(
                status_code=400,
                detail="Invalid URL scheme. Only HTTP and HTTPS are allowed."
            )
        
        hostname = parsed_url.hostname
        if not hostname:
            raise HTTPException(status_code=400, detail="URL must include a hostname.")

        # Resolve hostname to prevent DNS rebinding/bypass
        try:
            addr_info = socket.getaddrinfo(hostname, None)
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to resolve host.")
        ip_addresses = set()
        for entry in addr_info:
            ip = entry[4][0]
            try:
                ip_obj = ipaddress.ip_address(ip)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                    raise HTTPException(
                        status_code=400,
                        detail="Host resolves to a private, loopback, or link-local IP address. Not allowed."
                    )
                ip_addresses.add(ip)
            except ValueError:
                continue  # skip invalid IP addresses

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    # Download file from URL
    try:
        # Limit redirects to prevent redirect loops and SSRF
        # Note: URL is user-provided but validated above for SSRF protection
        # (private IPs, loopback, link-local addresses are blocked)
        # Re-parse and validate URL scheme and host before making the request.
        try:
            parsed_url = urlparse(url)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid URL format")

        if parsed_url.scheme not in ("http", "https"):
            raise HTTPException(status_code=400, detail="Only http and https URLs are allowed")

        hostname = parsed_url.hostname
        if not hostname:
            raise HTTPException(status_code=400, detail="URL must include a hostname")

        # Check if host is allowed (configurable via DOCUMENT_URL_HOST_VALIDATION and DOCUMENT_URL_ALLOWED_HOSTS)
        if not is_host_allowed(hostname):
            raise HTTPException(
                status_code=400,
                detail="Host not allowed. Configure DOCUMENT_URL_ALLOWED_HOSTS or set DOCUMENT_URL_HOST_VALIDATION=false."
            )

        # Reconstruct a safe URL using the validated components.
        safe_netloc = hostname
        if parsed_url.port:
            safe_netloc = f"{hostname}:{parsed_url.port}"
        safe_url = parsed_url._replace(netloc=safe_netloc).geturl()

        async with httpx.AsyncClient(timeout=30.0, max_redirects=3) as client:
            response = await client.get(safe_url)
            response.raise_for_status()
            
            # Get content type from response
            content_type = response.headers.get("content-type", "").split(";")[0].strip()
            
            # Validate file type
            if content_type not in ALLOWED_DOCUMENT_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {content_type}. Allowed types: PDF, TXT"
                )
            
            # Get filename from URL using proper URL parsing
            url_path = Path(parsed_url.path)
            original_name = url_path.stem if url_path.stem else "document"
            
            # Sanitize the original name to avoid path traversal
            safe_name = "".join(c for c in original_name if c.isalnum() or c in ('_', '-'))[:100]
            if not safe_name:
                safe_name = "document"
            
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            file_extension = MIME_TYPE_EXTENSION.get(content_type, ".pdf")
            filename = f"{item_id}_{timestamp}_{safe_name}{file_extension}"
            storage_path = f"documents/{filename}"
            
            # Save file using storage backend
            storage = get_storage()
            file_data = io.BytesIO(response.content)
            file_url = storage.save(file_data, storage_path, content_type=content_type)
            
            # Create document record
            document = models.Document(
                item_id=item_id,
                filename=f"{safe_name}{file_extension}",
                path=file_url,
                mime_type=content_type,
                document_type=document_type
            )
            
            db.add(document)
            db.commit()
            db.refresh(document)
            
            return document
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download file from URL: HTTP {e.response.status_code}"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download file from URL: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to upload document from URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
