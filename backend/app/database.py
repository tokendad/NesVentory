from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings
import os

# v2.0: Use SQLite for simplified deployment
# Database file stored in /app/data/nesventory.db (mount as volume for persistence)
DB_PATH = os.getenv("DB_PATH", "/app/data/nesventory.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLite-specific engine configuration
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    future=True
)

try:
    with engine.connect() as connection:
        print(f"Database connected successfully: {DB_PATH}")
except Exception as e:
    print(f"Database connection failed: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
