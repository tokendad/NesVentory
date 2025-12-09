from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pathlib import Path
from werkzeug.utils import secure_filename
from sqlalchemy import text, inspect
from .config import settings
import re

# 🔥 Setup logging FIRST before any other imports that might use logging
from .logging_config import setup_logging
setup_logging()

# 🔥 IMPORTANT: Load all SQLAlchemy models so tables get created
from . import models
from .database import Base, engine, SessionLocal
from .seed_data import seed_database
from .routers import items, locations, auth, status, photos, users, tags, encircle, ai, gdrive, logs, documents, plugins


def run_migrations():
    """
    Run database migrations to add missing columns to existing tables.
    
    This is needed because SQLAlchemy's create_all() only creates new tables,
    it doesn't add new columns to existing tables. This function checks for
    missing columns and adds them using ALTER TABLE statements.
    """
    # Whitelist of allowed table and column names for security
    # Only these exact names are permitted in migrations
    ALLOWED_TABLES = {"users", "items", "locations", "photos", "documents", "tags", "maintenance_tasks"}
    ALLOWED_COLUMNS = {"google_id", "estimated_value_ai_date", "estimated_value_user_date", "estimated_value_user_name",
                       "ai_schedule_enabled", "ai_schedule_interval_days", "ai_schedule_last_run",
                       "gdrive_refresh_token", "gdrive_last_backup", "upc_databases", "document_type"}
    ALLOWED_TYPES = {"VARCHAR(255)", "VARCHAR(20)", "VARCHAR(64)", "BOOLEAN DEFAULT FALSE", "INTEGER DEFAULT 7", "TIMESTAMP", "TEXT", "JSON"}
    
    # Define migrations: (table_name, column_name, column_definition)
    migrations = [
        # User model: google_id column added for Google OAuth SSO
        ("users", "google_id", "VARCHAR(255)"),
        # Item model: estimated value tracking columns for AI and user attribution
        ("items", "estimated_value_ai_date", "VARCHAR(20)"),
        ("items", "estimated_value_user_date", "VARCHAR(20)"),
        ("items", "estimated_value_user_name", "VARCHAR(255)"),
        # User model: AI schedule settings with defaults for existing users
        ("users", "ai_schedule_enabled", "BOOLEAN DEFAULT FALSE"),
        ("users", "ai_schedule_interval_days", "INTEGER DEFAULT 7"),
        ("users", "ai_schedule_last_run", "TIMESTAMP"),
        # User model: Google Drive backup settings
        ("users", "gdrive_refresh_token", "TEXT"),
        ("users", "gdrive_last_backup", "TIMESTAMP"),
        # User model: UPC database configuration (JSON array with priority order)
        ("users", "upc_databases", "JSON"),
        # Document model: document_type column for categorizing documents (manuals, attachments, etc.)
        ("documents", "document_type", "VARCHAR(64)"),
    ]
    
    with engine.begin() as conn:
        # Create inspector inside the connection context for fresh metadata
        inspector = inspect(conn)
        
        for table_name, column_name, column_type in migrations:
            # Validate against whitelist to prevent SQL injection
            if table_name not in ALLOWED_TABLES:
                print(f"Migration skipped: table '{table_name}' not in whitelist")
                continue
            if column_name not in ALLOWED_COLUMNS:
                print(f"Migration skipped: column '{column_name}' not in whitelist")
                continue
            if column_type not in ALLOWED_TYPES:
                print(f"Migration skipped: type '{column_type}' not in whitelist")
                continue
            
            # Check if table exists
            if table_name not in inspector.get_table_names():
                continue
                
            # Check if column already exists
            existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
            if column_name in existing_columns:
                continue
            
            # Add the missing column using validated identifiers
            try:
                # Using text() with pre-validated identifiers from whitelist
                alter_stmt = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                conn.execute(alter_stmt)
                # Transaction is automatically committed by engine.begin() context manager
                print(f"Migration: Added column '{column_name}' to table '{table_name}'")
            except Exception as e:
                print(f"Migration warning: Could not add column '{column_name}' to '{table_name}': {e}")


# Auto-create tables on startup and seed with test data
Base.metadata.create_all(bind=engine)

# Run migrations to add any missing columns to existing tables
run_migrations()

# Seed the database with test data if it's empty
try:
    db = SessionLocal()
    seed_database(db)
    
    # Verify seed data was created
    def warn_missing_data(entity_name: str, count: int):
        """Log warning if entity count is zero."""
        if count == 0:
            print(f"⚠️  WARNING: No {entity_name} found in database after seeding!")
            print("   This may indicate a seeding issue. See SEEDING.md for troubleshooting.")
    
    warn_missing_data("items", db.query(models.Item).count())
    warn_missing_data("locations", db.query(models.Location).count())
    
    db.close()
except Exception as e:
    print(f"Error seeding database: {e}")

app = FastAPI(
    title="Nesventory API",
    version=settings.VERSION,
)

# CORS origins now come from environment (.env or config)
def get_cors_origins():
    # settings.CORS_ORIGINS may be already a list, or a string split by comma
    if isinstance(settings.CORS_ORIGINS, str):
        return [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    return settings.CORS_ORIGINS or []

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(items.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(encircle.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(gdrive.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(plugins.router, prefix="/api")

# Setup uploads directory and mount static files
# Media files are stored in /app/data/media to ensure they persist with the database
UPLOAD_DIR = Path("/app/data/media")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "photos").mkdir(exist_ok=True)
(UPLOAD_DIR / "documents").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Mount frontend static files (v2.0 unified container)
STATIC_DIR = Path("/app/static")
if STATIC_DIR.exists():
    # Mount static assets (JS, CSS, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/version")
def version():
    return {
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME
    }

# Serve frontend for all non-API routes (must be last)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the frontend application for all non-API routes."""
    # Redirect API paths without trailing slash to include trailing slash
    # This allows FastAPI's routers to properly handle the request
    import re
    def is_safe_api_path(path: str) -> bool:
        # Allow only api or api/<subpath> where subpath consists of allowed chars.
        if not path:
            return False
        # Only allow api or api/...
        if path == "api":
            return True
        m = re.fullmatch(r"api/[\w\-/]*", path)
        return bool(m)
    
    if is_safe_api_path(full_path):
        # Only return redirect to safe API paths, always as relative URL
        safe_redirect = "/" + full_path.strip("/") + "/"
        return RedirectResponse(url=safe_redirect, status_code=307)
    
    # Prevent path traversal attacks
    if ".." in full_path or full_path.startswith("/"):
        return FileResponse(STATIC_DIR / "index.html")
    
    # Check if this is a static file request, sanitize each path segment
    segments = full_path.split('/')
    safe_segments = [secure_filename(seg) for seg in segments if seg and seg not in ('.', '..')]
    static_file = STATIC_DIR
    for seg in safe_segments:
        static_file = static_file / seg
    static_file = static_file.resolve()
    
    # Ensure the resolved path is within STATIC_DIR
    try:
        static_file.relative_to(STATIC_DIR.resolve())
    except ValueError:
        # Path traversal attempt detected
        return FileResponse(STATIC_DIR / "index.html")
    
    if static_file.is_file():
        return FileResponse(static_file)
    
    # For all other routes, serve index.html (SPA routing)
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    
    # Fallback if static directory doesn't exist (development mode)
    return {"message": "Frontend not built. Run 'npm run build' to build the frontend."}
