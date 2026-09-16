# Backend Dockerfile for Sample Browser API
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
# ffmpeg includes ffprobe for extracting metadata from CAF/ALAC files
# fluidsynth and fluid-soundfont-gm for MIDI synthesis/playback
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    fluidsynth \
    fluid-soundfont-gm \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create non-root user matching TrueNAS convention
RUN groupadd -g 568 appgroup && \
    useradd -u 568 -g appgroup -m appuser && \
    chown -R appuser:appgroup /app

# Create data directory
RUN mkdir -p /data && chown appuser:appgroup /data

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
    CMD curl -fsSL http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
