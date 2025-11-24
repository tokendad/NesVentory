from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .config import settings

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
    item_count = db.query(models.Item).count()
    location_count = db.query(models.Location).count()
    
    if item_count == 0:
        print("⚠️  WARNING: No items found in database after seeding!")
        print("   This may indicate a seeding issue. See SEEDING.md for troubleshooting.")
    
    if location_count == 0:
        print("⚠️  WARNING: No locations found in database after seeding!")
        print("   This may indicate a seeding issue. See SEEDING.md for troubleshooting.")
    
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
import os
UPLOAD_BASE = os.getenv("UPLOAD_DIR", "/app/uploads")
UPLOAD_DIR = Path(UPLOAD_BASE)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "photos").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/version")
def version():
    return {
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME
    }
