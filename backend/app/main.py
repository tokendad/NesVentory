from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from .config import settings
import os

# 🔥 IMPORTANT: Load all SQLAlchemy models so tables get created
from . import models
from .database import Base, engine, SessionLocal
from .seed_data import seed_database
from .routers import items, locations, auth, status, photos, users

# Auto-create tables on startup and seed with test data
Base.metadata.create_all(bind=engine)

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

# Setup uploads directory and mount static files
UPLOAD_BASE = os.getenv("UPLOAD_DIR", "/app/uploads")
UPLOAD_DIR = Path(UPLOAD_BASE)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "photos").mkdir(exist_ok=True)
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
    # Prevent path traversal attacks
    if ".." in full_path or full_path.startswith("/"):
        return FileResponse(STATIC_DIR / "index.html")
    
    # Check if this is a static file request
    static_file = (STATIC_DIR / full_path).resolve()
    
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
