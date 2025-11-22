from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..config import settings
from ..deps import get_db
import httpx
from typing import Dict, Any, Optional

router = APIRouter()


async def get_latest_postgres_version() -> Optional[str]:
    """Fetch the latest PostgreSQL version from official sources."""
    try:
        # Try to fetch from PostgreSQL official website
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://www.postgresql.org/versions.json")
            if response.status_code == 200:
                versions_data = response.json()
                if isinstance(versions_data, list) and len(versions_data) > 0:
                    # Get the first (latest) version
                    latest = versions_data[0]
                    if isinstance(latest, dict) and "numeric" in latest:
                        return str(latest.get("numeric", ""))
    except Exception:
        pass
    return None


def get_database_info(db: Session) -> Dict[str, Any]:
    """Get database health and information."""
    try:
        # Get PostgreSQL version
        version_result = db.execute(text("SELECT version()")).fetchone()
        postgres_version_full = version_result[0] if version_result else "Unknown"
        
        # Extract numeric version (e.g., "16.1" from "PostgreSQL 16.1...")
        postgres_version = "Unknown"
        if "PostgreSQL" in postgres_version_full:
            parts = postgres_version_full.split()
            if len(parts) > 1:
                postgres_version = parts[1]
        
        # Get database size
        db_size_result = db.execute(
            text("SELECT pg_database_size(current_database())")
        ).fetchone()
        db_size_bytes = db_size_result[0] if db_size_result else 0
        
        # Convert to human-readable format
        if db_size_bytes >= 1024 ** 3:  # GB
            db_size_readable = f"{db_size_bytes / (1024 ** 3):.2f} GB"
        elif db_size_bytes >= 1024 ** 2:  # MB
            db_size_readable = f"{db_size_bytes / (1024 ** 2):.2f} MB"
        elif db_size_bytes >= 1024:  # KB
            db_size_readable = f"{db_size_bytes / 1024:.2f} KB"
        else:
            db_size_readable = f"{db_size_bytes} bytes"
        
        # Get database location (data directory)
        data_dir_result = db.execute(text("SHOW data_directory")).fetchone()
        data_directory = data_dir_result[0] if data_dir_result else "Unknown"
        
        return {
            "status": "healthy",
            "version": postgres_version,
            "version_full": postgres_version_full,
            "size": db_size_readable,
            "size_bytes": db_size_bytes,
            "location": data_directory,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


@router.get("/status")
async def get_status(db: Session = Depends(get_db)):
    """
    Get comprehensive system status including health, version, and database information.
    """
    # Get database info
    database_info = get_database_info(db)
    
    # Get latest PostgreSQL version
    latest_postgres_version = await get_latest_postgres_version()
    
    # Determine if database version is current
    is_version_current = None
    if latest_postgres_version and database_info.get("version") != "Unknown":
        try:
            # Parse version strings (e.g., "16.11" or "15.1")
            current_parts = database_info["version"].split(".")
            latest_parts = latest_postgres_version.split(".")
            
            if len(current_parts) >= 1 and len(latest_parts) >= 1:
                current_major = int(current_parts[0])
                latest_major = int(latest_parts[0])
                
                # Compare major versions first
                if current_major < latest_major:
                    is_version_current = False
                elif current_major == latest_major:
                    # Same major version, compare minor if available
                    if len(current_parts) >= 2 and len(latest_parts) >= 2:
                        current_minor = int(current_parts[1])
                        latest_minor = int(latest_parts[1])
                        is_version_current = current_minor >= latest_minor
                    else:
                        is_version_current = True
                # If current_major > latest_major, leave is_version_current as None
                # This indicates an unexpected state (possibly dev/beta version)
        except (ValueError, IndexError):
            pass
    
    return {
        "application": {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "ok"
        },
        "database": {
            **database_info,
            "latest_version": latest_postgres_version,
            "is_version_current": is_version_current,
        }
    }
