from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
import pathlib


def _get_version() -> str:
    """Read version from VERSION file in repository root."""
    # Search upward from this file to find the VERSION file
    current = pathlib.Path(__file__).resolve()
    for parent in current.parents:
        version_file = parent / "VERSION"
        if version_file.exists():
            return version_file.read_text().strip()
    return "1.0.0-alpha"  # Fallback version if VERSION file not found


class Settings(BaseSettings):
    PROJECT_NAME: str = "NesVentory"
    VERSION: str = _get_version()

    BACKEND_PORT: int = 8181
    FRONTEND_PORT: int = 5173
    
    # Application URL for QR code generation (used by printer service)
    APP_URL: str = "http://localhost:3000"

    # v2.0: Database fields are optional for SQLite (not used)
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "nesventory"
    DB_PASSWORD: str | None = None  # Optional for SQLite
    DB_NAME: str = "nesventory"

    JWT_SECRET_KEY: str  # No default - must be set in environment
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # For compatibility with auth.py
    SECRET_KEY: str  # No default - must be set in environment
    ALGORITHM: str = "HS256"

    CORS_ORIGINS: List[AnyHttpUrl] | List[str] = []

    # AI Photo Detection settings (Gemini)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    # Delay between AI requests in seconds (to avoid rate limits on free tier)
    # Free tier allows 15 requests per minute, so 4-5 seconds delay is recommended
    GEMINI_REQUEST_DELAY: float = 4.0

    # Google OAuth settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # OIDC settings (Authelia etc)
    OIDC_CLIENT_ID: Optional[str] = None
    OIDC_CLIENT_SECRET: Optional[str] = None
    OIDC_DISCOVERY_URL: Optional[str] = None
    OIDC_PROVIDER_NAME: str = "OIDC"
    OIDC_BUTTON_TEXT: str = "Sign in with OIDC"

    # Registration settings
    DISABLE_SIGNUPS: bool = False

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Available Gemini models for selection
# Updated from https://ai.google.dev/gemini-api/docs/models
AVAILABLE_GEMINI_MODELS = [
    {
        "id": "gemini-2.0-flash-exp",
        "name": "Gemini 2.0 Flash (Experimental)",
        "description": "Latest experimental flash model with improved speed and intelligence"
    },
    {
        "id": "gemini-1.5-flash",
        "name": "Gemini 1.5 Flash",
        "description": "Fast and efficient for high-throughput tasks"
    },
    {
        "id": "gemini-1.5-flash-8b",
        "name": "Gemini 1.5 Flash-8B",
        "description": "Smaller, faster version for simple tasks with tight latency requirements"
    },
    {
        "id": "gemini-1.5-pro",
        "name": "Gemini 1.5 Pro",
        "description": "Best for complex reasoning tasks, long context understanding"
    },
    {
        "id": "gemini-exp-1206",
        "name": "Gemini Experimental (1206)",
        "description": "Latest experimental model with cutting-edge features"
    }
]


settings = Settings()


def get_settings():
    """Helper function to get settings instance."""
    return settings
