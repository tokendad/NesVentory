from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..config import settings
from ..deps import get_db
from ..database import SQLALCHEMY_DATABASE_URL, db_path
import httpx
import os
from typing import Dict, Any, Optional

router = APIRouter()


async def get_latest_postgres_version() -> Optional[str]:
    """Fetch the latest PostgreSQL version from official sources."""
    try:
        # Try to fetch from PostgreSQL official website
        async with httpx.AsyncClient(timeout=2.0) as client:
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
        # Detect database type from the connection URL (before querying)
        is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
        is_postgres = "postgresql" in SQLALCHEMY_DATABASE_URL.lower()
        
        # Get database version using appropriate query for the database type
        if is_sqlite:
            version_result = db.execute(text("SELECT sqlite_version()")).fetchone()
        else:
            version_result = db.execute(text("SELECT version()")).fetchone()
        
        version_full = version_result[0] if version_result else "Unknown"
        
        db_version = "Unknown"
        db_size_readable = "Unknown"
        db_size_bytes = 0
        data_directory = "Unknown"
        
        if is_postgres:
            # Extract PostgreSQL numeric version (e.g., "16.1" from "PostgreSQL 16.1...")
            parts = version_full.split()
            if len(parts) > 1:
                db_version = parts[1]
            
            # Get database size (PostgreSQL-specific)
            try:
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
            except Exception:
                db_size_readable = "Unknown"
            
            # Get database location (data directory) - PostgreSQL-specific
            try:
                data_dir_result = db.execute(text("SHOW data_directory")).fetchone()
                data_directory = data_dir_result[0] if data_dir_result else "Unknown"
            except Exception:
                data_directory = "Unknown"
        
        elif is_sqlite:
            # For SQLite, sqlite_version() returns just the version string (e.g., "3.37.2")
            db_version = version_full
            
            # Get database file size from the file system
            try:
                if os.path.exists(db_path):
                    db_size_bytes = os.path.getsize(db_path)
                    # Convert to human-readable format
                    if db_size_bytes >= 1024 ** 3:  # GB
                        db_size_readable = f"{db_size_bytes / (1024 ** 3):.2f} GB"
                    elif db_size_bytes >= 1024 ** 2:  # MB
                        db_size_readable = f"{db_size_bytes / (1024 ** 2):.2f} MB"
                    elif db_size_bytes >= 1024:  # KB
                        db_size_readable = f"{db_size_bytes / 1024:.2f} KB"
                    else:
                        db_size_readable = f"{db_size_bytes} bytes"
                else:
                    db_size_readable = "Database file not found"
            except Exception:
                db_size_readable = "Unknown"
            
            # Get database file location
            data_directory = str(db_path)
        
        return {
            "status": "healthy",
            "version": db_version,
            "version_full": version_full,
            "size": db_size_readable,
            "size_bytes": db_size_bytes,
            "location": data_directory,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "version": "Unknown",
            "version_full": str(e),
            "size": "Unknown",
            "size_bytes": 0,
            "location": "Unknown",
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
