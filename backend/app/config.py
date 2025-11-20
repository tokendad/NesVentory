from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "NesVentory"

    BACKEND_PORT: int = 8001
    FRONTEND_PORT: int = 5173

    DB_HOST: str = "nesventory_db"
    DB_PORT: int = 5432
    DB_USER: str = "nesventory"
    DB_PASSWORD: str = "nesventory"
    DB_NAME: str = "nesventory"

    JWT_SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # For compatibility with auth.py
    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET"
    ALGORITHM: str = "HS256"

    CORS_ORIGINS: List[AnyHttpUrl] | List[str] = []

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def get_settings():
    """Helper function to get settings instance."""
    return settings
