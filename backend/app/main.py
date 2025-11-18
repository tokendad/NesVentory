from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 🔥 IMPORTANT: Load all SQLAlchemy models so tables get created
from . import models

from .database import Base, engine

# If you want auto-create tables on startup (optional)
# Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nesventory API")

# Basic CORS to allow local frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
