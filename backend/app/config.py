"""Application configuration from environment variables."""

import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Paths
    database_path: str = "/data/samples.db"
    audio_path: str = "/audio"
    log_level: str = "info"

    # Scanning behavior
    scan_on_startup: bool = True
    watch_for_changes: bool = False

    # Audio file extensions to index
    audio_extensions: set[str] = {
        ".wav",
        ".mp3",
        ".aif",
        ".aiff",
        ".flac",
        ".ogg",
        ".m4a",
        ".wma",
        ".caf",
        ".mid",
        ".midi",
    }

    # API settings
    api_prefix: str = "/api"
    default_page_size: int = 50
    max_page_size: int = 200

    # CORS settings - comma-separated list of allowed origins
    # Default allows local development; set CORS_ORIGINS env var for production
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_prefix = ""
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def ensure_data_directory():
    """Ensure the data directory exists."""
    settings = get_settings()
    db_dir = Path(settings.database_path).parent
    db_dir.mkdir(parents=True, exist_ok=True)
