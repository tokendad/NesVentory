from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

# 🔥 IMPORTANT: Load all SQLAlchemy models so tables get created
from . import models
from .database import Base, engine

# If you want auto-create tables on startup (optional)
# Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nesventory API")

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

@app.get("/api/health")
def health():
    return {"status": "ok"}

# TEMPORARY — will be replaced with real DB queries later
@app.get("/api/items")
def list_items():
    return [
        {
            "id": 1,
            "name": "Sample TV",
            "location": "Living Room",
            "value": 500,
            "category": "Electronics",
        },
        {
            "id": 2,
            "name": "Sofa",
            "location": "Living Room",
            "value": 800,
            "category": "Furniture",
        },
    ]
