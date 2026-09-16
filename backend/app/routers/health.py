"""Health check endpoints."""

import os
from pathlib import Path
from fastapi import APIRouter

from ..database.connection import get_db
from ..config import get_settings
from ..models.search import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns service status, database connectivity, and audio path availability.
    """
    settings = get_settings()

    # Check database
    db_status = "ok"
    total_samples = 0
    try:
        with get_db() as conn:
            result = conn.execute("SELECT COUNT(*) FROM samples").fetchone()
            total_samples = result[0] if result else 0
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Check audio path
    audio_path = Path(settings.audio_path)
    if audio_path.exists() and audio_path.is_dir():
        audio_status = "ok"
    else:
        audio_status = "not found"

    return HealthResponse(
        status="healthy" if db_status == "ok" else "degraded",
        database=db_status,
        audio_path=audio_status,
        total_samples=total_samples,
    )
