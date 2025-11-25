from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings
import os
from pathlib import Path

# v2.0: Use SQLite for simplified deployment
# Database file location:
# - Docker: /app/data/nesventory.db (mount as volume for persistence)
# - Local development: ./data/nesventory.db (relative to working directory)

def is_running_in_docker():
    """Detect if running inside a Docker container."""
    # Check for Docker-specific files/markers
    return Path("/.dockerenv").exists() or os.getenv("DOCKER_CONTAINER") == "true"

# Determine default DB path based on environment
def get_default_db_path():
    """Get the default database path based on the environment."""
    # If running in Docker container, use /app/data
    if is_running_in_docker():
        return "/app/data/nesventory.db"
    # For local development, use ./data relative to working directory
    return str(Path("./data/nesventory.db").resolve())

DB_PATH = os.getenv("DB_PATH", get_default_db_path())

# Resolve the database path
db_path = Path(DB_PATH).resolve()

# Create the parent directory if it doesn't exist
db_path.parent.mkdir(parents=True, exist_ok=True)

# Validate path is absolute and doesn't reference parent directories in the original input
# This prevents path traversal attacks like "../../etc/passwd"
if ".." in DB_PATH:
    raise ValueError(f"DB_PATH must not contain path traversal characters '..': {DB_PATH}")

# Ensure the resolved path has a valid parent directory (already exists after mkdir above)
if not db_path.parent.is_dir():
    raise ValueError(f"DB_PATH parent directory could not be created: {db_path.parent}")

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
