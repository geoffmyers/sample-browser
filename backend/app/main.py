"""FastAPI application entry point."""

import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings, ensure_data_directory
from .database.connection import init_db, close_db
from .routers import samples_router, health_router
from .services.indexer import get_indexer

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Configure logging with structured format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)

# Add a filter to inject request_id into all log records
class RequestIdFilter(logging.Filter):
    """Filter that adds request_id to log records."""

    def filter(self, record):
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True

# Apply filter to root logger
for handler in logging.root.handlers:
    handler.addFilter(RequestIdFilter())

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that adds request ID and logs request details."""

    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID (use existing header if present)
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Create a logging adapter with request context
        start_time = time.time()

        # Log request (skip health checks to reduce noise)
        if not request.url.path.endswith("/health"):
            logger.info(
                f"Request started: {request.method} {request.url.path}",
                extra={"request_id": request_id},
            )

        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log response (skip health checks)
        if not request.url.path.endswith("/health"):
            logger.info(
                f"Request completed: {request.method} {request.url.path} "
                f"status={response.status_code} duration={duration_ms:.1f}ms",
                extra={"request_id": request_id},
            )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response


async def _run_background_scan(indexer):
    """Run indexer scan in background without blocking startup."""
    try:
        # Run in thread pool to not block event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, indexer.run_scan)
        logger.info(f"Background scan complete: {result}")
    except Exception as e:
        logger.error(f"Background scan failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()

    # Startup
    logger.info("Starting Sample Browser API")
    logger.info(f"Audio path: {settings.audio_path}")
    logger.info(f"Database path: {settings.database_path}")

    ensure_data_directory()
    init_db()

    # Run initial scan if configured (in background to not block startup)
    if settings.scan_on_startup:
        indexer = get_indexer()
        if not indexer.is_scanning:
            logger.info("Starting background scan...")
            asyncio.create_task(_run_background_scan(indexer))

    yield

    # Shutdown
    logger.info("Shutting down Sample Browser API")
    close_db()


# Create FastAPI app
app = FastAPI(
    title="Sample Browser API",
    description="API for browsing and searching audio samples and loops",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add request logging middleware (added first, runs last in the chain)
app.add_middleware(RequestLoggingMiddleware)

# Add CORS middleware with configurable origins
# Set CORS_ORIGINS environment variable for production (comma-separated list)
cors_settings = get_settings()
allowed_origins = [origin.strip() for origin in cors_settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
settings = get_settings()
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(samples_router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Sample Browser API",
        "version": "1.0.0",
        "docs": "/docs",
    }
