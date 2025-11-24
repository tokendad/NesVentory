from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings
import os
from pathlib import Path

# v2.0: Use SQLite for simplified deployment
# Database file stored in /app/data/nesventory.db (mount as volume for persistence)
DB_PATH = os.getenv("DB_PATH", "/app/data/nesventory.db")

# Validate DB_PATH to prevent path traversal
db_path = Path(DB_PATH).resolve()
data_dir = Path("/app/data").resolve()
if not str(db_path).startswith(str(data_dir)):
    raise ValueError(f"DB_PATH must be within /app/data directory, got: {DB_PATH}")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

# SQLite-specific engine configuration
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    future=True
)

try:
    with engine.connect() as connection:
        print(f"Database connected successfully: {db_path}")
except Exception as e:
    print(f"Database connection failed: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
