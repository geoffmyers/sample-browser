"""Sample CRUD and search endpoints."""

import math
import mimetypes
import re
import subprocess
import logging
from pathlib import Path
from typing import Optional, Literal

import filetype
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks, UploadFile, File, Response, Request
from fastapi.responses import FileResponse, StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter instance (shared with main.py)
limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger(__name__)

# Valid audio MIME types for file upload verification
VALID_AUDIO_MIMES = {
    "audio/mpeg",       # MP3
    "audio/wav",        # WAV
    "audio/x-wav",      # WAV (alternate)
    "audio/wave",       # WAV (alternate)
    "audio/aiff",       # AIFF
    "audio/x-aiff",     # AIFF (alternate)
    "audio/flac",       # FLAC
    "audio/x-flac",     # FLAC (alternate)
    "audio/ogg",        # OGG
    "audio/x-m4a",      # M4A
    "audio/mp4",        # M4A (alternate)
    "audio/x-caf",      # CAF
    "audio/midi",       # MIDI
    "audio/x-midi",     # MIDI (alternate)
    "audio/x-ms-wma",   # WMA
}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal attacks.
    Removes directory separators, null bytes, and other dangerous characters.
    """
    if not filename:
        return ""
    # Remove any directory path components
    filename = Path(filename).name
    # Remove null bytes and other control characters
    filename = re.sub(r'[\x00-\x1f\x7f]', '', filename)
    # Remove path separators that might slip through
    filename = filename.replace('/', '').replace('\\', '')
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    # Ensure we still have something left
    return filename if filename else "unnamed_file"


def sanitize_fts5_query(query: str) -> str:
    """
    Sanitize a search query for FTS5 to prevent syntax errors.
    Escapes special FTS5 characters and operators.
    """
    if not query:
        return ""
    # Remove characters that have special meaning in FTS5
    # FTS5 special: *, ", (, ), :, ^, AND, OR, NOT, NEAR
    # We'll escape quotes by doubling them and remove other operators
    sanitized = query.replace('"', '""')
    # Remove standalone operators (preserve as part of words)
    sanitized = re.sub(r'\b(AND|OR|NOT|NEAR)\b', '', sanitized, flags=re.IGNORECASE)
    # Remove special characters that could cause syntax errors
    sanitized = re.sub(r'[*():^]', ' ', sanitized)
    # Collapse multiple spaces
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    # Wrap in quotes for phrase search if it contains spaces
    if ' ' in sanitized and sanitized:
        return f'"{sanitized}"'
    return sanitized

# File extensions that require transcoding for browser playback
TRANSCODE_EXTENSIONS = {".caf"}

# MIDI file extensions that need synthesis for playback
MIDI_EXTENSIONS = {".mid", ".midi"}

# File extensions that are web-compatible and don't need transcoding
WEB_COMPATIBLE_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".aiff", ".aif"}

# Register CAF MIME type (not in standard mimetypes database)
mimetypes.add_type("audio/x-caf", ".caf")
mimetypes.add_type("audio/midi", ".mid")
mimetypes.add_type("audio/midi", ".midi")

from ..database.connection import get_db
from ..config import get_settings
from ..models.sample import Sample
from ..models.search import (
    SampleResponse,
    SampleListResponse,
    DirectoryInfo,
    InstrumentInfo,
    KeyInfo,
    GenreInfo,
    FileTypeInfo,
    ScanStatusResponse,
)
from ..services.indexer import get_indexer
from ..services.images import get_cached_directory_image

router = APIRouter(prefix="/samples", tags=["samples"])


def sample_to_response(sample: Sample) -> SampleResponse:
    """Convert Sample model to SampleResponse."""
    return SampleResponse(
        id=sample.id,
        filepath=sample.filepath,
        filename=sample.filename,
        directory=sample.directory,
        file_extension=sample.file_extension,
        file_size_bytes=sample.file_size_bytes,
        instrument=sample.instrument,
        descriptors=sample.descriptors,
        tempo_bpm=sample.tempo_bpm,
        key_signature=sample.key_signature,
        scale_type=sample.scale_type,
        full_key=sample.full_key,
        genre=sample.genre,
        duration_seconds=sample.duration_seconds,
        sample_rate=sample.sample_rate,
        channels=sample.channels,
        bit_depth=sample.bit_depth,
        length_bars=sample.length_bars,
        sample_type=sample.sample_type,
        is_loop=sample.is_loop,
        is_processed=sample.is_processed,
        is_polyphonic=sample.is_polyphonic,
        time_signature=sample.time_signature,
        created_at=sample.created_at,
        indexed_at=sample.indexed_at,
    )


@router.get("", response_model=SampleListResponse)
async def list_samples(
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    # Filters
    q: Optional[str] = Query(None, description="Full-text search query"),
    directory: Optional[str] = Query(None, description="Filter by directory path"),
    instrument: Optional[str] = Query(None, description="Filter by instrument (comma-separated for multiple)"),
    tempo_min: Optional[float] = Query(
        None, ge=20, le=300, description="Minimum tempo BPM"
    ),
    tempo_max: Optional[float] = Query(
        None, ge=20, le=300, description="Maximum tempo BPM"
    ),
    key: Optional[str] = Query(None, description="Filter by key signature (comma-separated for multiple)"),
    scale: Optional[Literal["major", "minor"]] = Query(
        None, description="Filter by scale type"
    ),
    genre: Optional[str] = Query(None, description="Filter by genre (comma-separated for multiple)"),
    bars_min: Optional[float] = Query(
        None, ge=1, le=128, description="Minimum length in bars"
    ),
    bars_max: Optional[float] = Query(
        None, ge=1, le=128, description="Maximum length in bars"
    ),
    duration_min: Optional[float] = Query(
        None, ge=0, description="Minimum duration in seconds"
    ),
    duration_max: Optional[float] = Query(
        None, description="Maximum duration in seconds"
    ),
    # Extended classification filters
    sample_type: Optional[Literal["audio", "midi"]] = Query(
        None, description="Filter by sample type"
    ),
    is_loop: Optional[bool] = Query(
        None, description="Filter by loop (true) or one-shot (false)"
    ),
    is_processed: Optional[bool] = Query(
        None, description="Filter by processed (true) or dry (false)"
    ),
    time_signature: Optional[str] = Query(
        None, description="Filter by time signature (e.g., '4/4', '3/4')"
    ),
    # Audio properties filters
    sample_rate_min: Optional[int] = Query(
        None, ge=8000, le=192000, description="Minimum sample rate in Hz"
    ),
    sample_rate_max: Optional[int] = Query(
        None, ge=8000, le=192000, description="Maximum sample rate in Hz"
    ),
    bit_depth: Optional[int] = Query(
        None, description="Filter by bit depth (e.g., 16, 24, 32)"
    ),
    channels: Optional[int] = Query(
        None, ge=1, le=2, description="Filter by channels (1=mono, 2=stereo)"
    ),
    file_size_min: Optional[int] = Query(
        None, ge=0, description="Minimum file size in bytes"
    ),
    file_size_max: Optional[int] = Query(
        None, description="Maximum file size in bytes"
    ),
    file_extension: Optional[str] = Query(
        None, description="Filter by file extension (comma-separated for multiple, e.g., '.wav,.mp3')"
    ),
    # Additional filters for completeness
    descriptors: Optional[str] = Query(
        None, description="Filter by descriptor/tag (partial match)"
    ),
    is_polyphonic: Optional[bool] = Query(
        None, description="Filter by polyphonic (true) or monophonic (false)"
    ),
    created_at_min: Optional[str] = Query(
        None, description="Filter by minimum created date (ISO format: YYYY-MM-DD)"
    ),
    created_at_max: Optional[str] = Query(
        None, description="Filter by maximum created date (ISO format: YYYY-MM-DD)"
    ),
    # Filter by specific IDs (for favorites)
    ids: Optional[str] = Query(
        None, description="Comma-separated list of sample IDs to filter by (for favorites)"
    ),
    # Sorting
    sort_by: Literal[
        "filename", "directory", "tempo_bpm", "key_signature", "created_at",
        "duration_seconds", "length_bars", "instrument", "genre", "time_signature",
        "is_loop", "is_processed", "is_polyphonic", "sample_type",
        "sample_rate", "bit_depth", "channels", "file_size_bytes", "file_extension"
    ] = Query("filename", description="Sort field"),
    sort_order: Literal["asc", "desc"] = Query("asc", description="Sort order"),
) -> SampleListResponse:
    """
    List samples with pagination, filtering, and sorting.
    """
    settings = get_settings()

    # Build query
    conditions = []
    params = []

    # Always exclude files with 0 bytes (corrupt or placeholder files)
    conditions.append("(file_size_bytes IS NULL OR file_size_bytes > 0)")

    if q:
        # Use FTS5 for full-text search with sanitized query
        sanitized_query = sanitize_fts5_query(q)
        if sanitized_query:
            conditions.append(
                "id IN (SELECT rowid FROM samples_fts WHERE samples_fts MATCH ?)"
            )
            params.append(sanitized_query)

    if directory:
        conditions.append("directory LIKE ?")
        params.append(f"{directory}%")

    if instrument:
        # Support comma-separated values for multi-select
        instrument_list = [i.strip() for i in instrument.split(",") if i.strip()]
        if len(instrument_list) == 1:
            conditions.append("instrument = ?")
            params.append(instrument_list[0])
        elif len(instrument_list) > 1:
            placeholders = ",".join("?" * len(instrument_list))
            conditions.append(f"instrument IN ({placeholders})")
            params.extend(instrument_list)

    if tempo_min is not None:
        conditions.append("tempo_bpm >= ?")
        params.append(tempo_min)

    if tempo_max is not None:
        conditions.append("tempo_bpm <= ?")
        params.append(tempo_max)

    if key:
        # Support comma-separated values for multi-select
        key_list = [k.strip() for k in key.split(",") if k.strip()]
        if len(key_list) == 1:
            conditions.append("key_signature = ?")
            params.append(key_list[0])
        elif len(key_list) > 1:
            placeholders = ",".join("?" * len(key_list))
            conditions.append(f"key_signature IN ({placeholders})")
            params.extend(key_list)

    if scale:
        conditions.append("scale_type = ?")
        params.append(scale)

    if genre:
        # Support comma-separated values for multi-select
        genre_list = [g.strip() for g in genre.split(",") if g.strip()]
        if len(genre_list) == 1:
            conditions.append("genre = ?")
            params.append(genre_list[0])
        elif len(genre_list) > 1:
            placeholders = ",".join("?" * len(genre_list))
            conditions.append(f"genre IN ({placeholders})")
            params.extend(genre_list)

    if bars_min is not None:
        conditions.append("length_bars >= ?")
        params.append(bars_min)

    if bars_max is not None:
        conditions.append("length_bars <= ?")
        params.append(bars_max)

    if duration_min is not None:
        conditions.append("duration_seconds >= ?")
        params.append(duration_min)

    if duration_max is not None:
        conditions.append("duration_seconds <= ?")
        params.append(duration_max)

    if sample_type is not None:
        conditions.append("sample_type = ?")
        params.append(sample_type)

    if is_loop is not None:
        conditions.append("is_loop = ?")
        params.append(1 if is_loop else 0)

    if is_processed is not None:
        conditions.append("is_processed = ?")
        params.append(1 if is_processed else 0)

    if time_signature is not None:
        conditions.append("time_signature = ?")
        params.append(time_signature)

    # Audio properties filters
    if sample_rate_min is not None:
        conditions.append("sample_rate >= ?")
        params.append(sample_rate_min)

    if sample_rate_max is not None:
        conditions.append("sample_rate <= ?")
        params.append(sample_rate_max)

    if bit_depth is not None:
        conditions.append("bit_depth = ?")
        params.append(bit_depth)

    if channels is not None:
        conditions.append("channels = ?")
        params.append(channels)

    if file_size_min is not None:
        conditions.append("file_size_bytes >= ?")
        params.append(file_size_min)

    if file_size_max is not None:
        conditions.append("file_size_bytes <= ?")
        params.append(file_size_max)

    if file_extension:
        # Support comma-separated values for multi-select
        ext_list = [e.strip() for e in file_extension.split(",") if e.strip()]
        if len(ext_list) == 1:
            conditions.append("file_extension = ?")
            params.append(ext_list[0])
        elif len(ext_list) > 1:
            placeholders = ",".join("?" * len(ext_list))
            conditions.append(f"file_extension IN ({placeholders})")
            params.extend(ext_list)

    if descriptors:
        # Search within JSON array of descriptors
        conditions.append("descriptors_json LIKE ?")
        params.append(f"%{descriptors}%")

    if is_polyphonic is not None:
        conditions.append("is_polyphonic = ?")
        params.append(1 if is_polyphonic else 0)

    if created_at_min:
        conditions.append("date(created_at) >= ?")
        params.append(created_at_min)

    if created_at_max:
        conditions.append("date(created_at) <= ?")
        params.append(created_at_max)

    # Filter by specific IDs (for favorites)
    if ids:
        try:
            id_list = [int(id.strip()) for id in ids.split(",") if id.strip()]
            if id_list:
                placeholders = ",".join("?" * len(id_list))
                conditions.append(f"id IN ({placeholders})")
                params.extend(id_list)
            else:
                # Empty ID list means no results
                return SampleListResponse(items=[], total=0, page=page, per_page=per_page, pages=0)
        except ValueError:
            # Invalid ID format, return empty results
            return SampleListResponse(items=[], total=0, page=page, per_page=per_page, pages=0)

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Map sort field to column name (all fields map directly to column names)
    sort_map = {
        "filename": "filename",
        "directory": "directory",
        "tempo_bpm": "tempo_bpm",
        "key_signature": "key_signature",
        "created_at": "created_at",
        "duration_seconds": "duration_seconds",
        "length_bars": "length_bars",
        "instrument": "instrument",
        "genre": "genre",
        "time_signature": "time_signature",
        "is_loop": "is_loop",
        "is_processed": "is_processed",
        "is_polyphonic": "is_polyphonic",
        "sample_type": "sample_type",
        "sample_rate": "sample_rate",
        "bit_depth": "bit_depth",
        "channels": "channels",
        "file_size_bytes": "file_size_bytes",
        "file_extension": "file_extension",
    }
    sort_column = sort_map[sort_by]
    order_by = f"{sort_column} {sort_order.upper()}"

    # Handle NULL values in sorting (put NULLs at the end)
    nullable_fields = (
        "tempo_bpm", "duration_seconds", "length_bars", "key_signature",
        "directory", "instrument", "genre", "time_signature", "is_loop",
        "is_processed", "is_polyphonic", "sample_type",
        "sample_rate", "bit_depth", "channels", "file_size_bytes"
    )
    if sort_by in nullable_fields:
        order_by = f"{sort_column} IS NULL, {order_by}"

    # Execute queries
    with get_db() as conn:
        # Get total count
        count_sql = f"SELECT COUNT(*) FROM samples WHERE {where_clause}"
        total = conn.execute(count_sql, params).fetchone()[0]

        # Get page of results
        offset = (page - 1) * per_page
        data_sql = f"""
            SELECT * FROM samples
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        """
        rows = conn.execute(data_sql, params + [per_page, offset]).fetchall()

    # Convert to response
    items = [sample_to_response(Sample.from_row(dict(row))) for row in rows]
    pages = math.ceil(total / per_page) if total > 0 else 1

    return SampleListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/search", response_model=list[SampleResponse])
async def search_samples(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
) -> list[SampleResponse]:
    """
    Full-text search across filenames and metadata.
    """
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT s.* FROM samples s
            JOIN samples_fts fts ON s.id = fts.rowid
            WHERE samples_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (q, limit),
        ).fetchall()

    return [sample_to_response(Sample.from_row(dict(row))) for row in rows]


@router.get("/directories", response_model=list[DirectoryInfo])
async def list_directories(response: Response) -> list[DirectoryInfo]:
    """
    List all indexed directories with sample counts.
    """
    # Cache for 5 minutes - directories change infrequently
    response.headers["Cache-Control"] = "public, max-age=300"

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT directory, COUNT(*) as sample_count
            FROM samples
            GROUP BY directory
            ORDER BY directory
            """
        ).fetchall()

    return [
        DirectoryInfo(
            path=row["directory"],
            name=Path(row["directory"]).name or row["directory"],
            sample_count=row["sample_count"],
        )
        for row in rows
    ]


@router.get("/instruments", response_model=list[InstrumentInfo])
async def list_instruments(response: Response) -> list[InstrumentInfo]:
    """
    List all instruments with sample counts.
    """
    # Cache for 5 minutes - instruments change infrequently
    response.headers["Cache-Control"] = "public, max-age=300"

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT instrument, COUNT(*) as sample_count
            FROM samples
            WHERE instrument IS NOT NULL
            GROUP BY instrument
            ORDER BY sample_count DESC
            """
        ).fetchall()

    return [
        InstrumentInfo(name=row["instrument"], sample_count=row["sample_count"])
        for row in rows
    ]


@router.get("/keys", response_model=list[KeyInfo])
async def list_keys(response: Response) -> list[KeyInfo]:
    """
    List all key signatures with sample counts.
    """
    # Cache for 5 minutes - keys change infrequently
    response.headers["Cache-Control"] = "public, max-age=300"

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT key_signature, scale_type, COUNT(*) as sample_count
            FROM samples
            WHERE key_signature IS NOT NULL
            GROUP BY key_signature, scale_type
            ORDER BY key_signature, scale_type
            """
        ).fetchall()

    return [
        KeyInfo(
            key_signature=row["key_signature"],
            scale_type=row["scale_type"] or "major",
            sample_count=row["sample_count"],
        )
        for row in rows
    ]


@router.get("/directory-image")
async def get_directory_image(
    directory: str = Query(..., description="Directory path to get image for"),
):
    """
    Get cover art or thumbnail image for a directory.
    Returns the image file if found, or 404 if no image exists.
    """
    image_path = get_cached_directory_image(directory)

    if not image_path:
        raise HTTPException(status_code=404, detail="No image found for directory")

    filepath = Path(image_path)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    # Determine content type
    content_type, _ = mimetypes.guess_type(str(filepath))
    if not content_type:
        content_type = "image/jpeg"

    return FileResponse(
        path=filepath,
        media_type=content_type,
        filename=filepath.name,
    )


@router.get("/genres", response_model=list[GenreInfo])
async def list_genres(response: Response) -> list[GenreInfo]:
    """
    List all genres with sample counts.
    """
    # Cache for 5 minutes - genres change infrequently
    response.headers["Cache-Control"] = "public, max-age=300"

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT genre, COUNT(*) as sample_count
            FROM samples
            WHERE genre IS NOT NULL
            GROUP BY genre
            ORDER BY sample_count DESC
            """
        ).fetchall()

    return [
        GenreInfo(name=row["genre"], sample_count=row["sample_count"])
        for row in rows
    ]


@router.get("/file-types", response_model=list[FileTypeInfo])
async def list_file_types(response: Response) -> list[FileTypeInfo]:
    """
    List all file types (extensions) with sample counts.
    """
    # Cache for 5 minutes - file types change infrequently
    response.headers["Cache-Control"] = "public, max-age=300"

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT file_extension, COUNT(*) as sample_count
            FROM samples
            WHERE file_extension IS NOT NULL
            GROUP BY file_extension
            ORDER BY sample_count DESC
            """
        ).fetchall()

    return [
        FileTypeInfo(extension=row["file_extension"], sample_count=row["sample_count"])
        for row in rows
    ]


@router.get("/scan/status", response_model=ScanStatusResponse)
async def get_scan_status() -> ScanStatusResponse:
    """
    Get current scan status.
    """
    indexer = get_indexer()
    status = indexer.get_scan_status()

    return ScanStatusResponse(
        status=status["status"],
        progress_percent=status["progress_percent"],
        files_scanned=status["files_scanned"],
        files_total=status["files_total"],
        started_at=status.get("started_at"),
        error_message=status.get("error_message"),
    )


@router.post("/scan", response_model=dict)
@limiter.limit("5/minute")
async def trigger_scan(
    request: Request,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Force re-parsing of all files, even if unchanged"),
) -> dict:
    """
    Trigger a background rescan of the audio directory.

    Use force=true to re-parse all files and update metadata fields.
    """
    indexer = get_indexer()

    if indexer.is_scanning:
        return {"status": "already_running", "message": "Scan already in progress"}

    # Run scan in background
    background_tasks.add_task(indexer.run_scan, force_reparse=force)

    return {"status": "started", "message": "Scan started in background"}


@router.post("/upload", response_model=dict)
@limiter.limit("30/minute")
async def upload_files(
    request: Request,
    files: list[UploadFile] = File(..., description="Audio files to upload"),
    directory: str = Query("uploads", description="Target directory within audio path"),
    background_tasks: BackgroundTasks = None,
) -> dict:
    """
    Upload multiple audio files to the library.
    Files are saved to the specified directory and automatically indexed.
    """
    settings = get_settings()
    audio_path = Path(settings.audio_path)

    # Sanitize directory to prevent path traversal
    # Remove any .. components and normalize
    safe_directory = Path(directory).as_posix()
    safe_directory = '/'.join(
        part for part in safe_directory.split('/')
        if part and part != '..' and part != '.'
    )
    if not safe_directory:
        safe_directory = "uploads"

    # Validate and create target directory
    target_dir = audio_path / safe_directory

    # Ensure the resolved path is still within audio_path
    try:
        target_dir.resolve().relative_to(audio_path.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid directory path")

    target_dir.mkdir(parents=True, exist_ok=True)

    # Validate file extensions
    allowed_extensions = settings.audio_extensions
    uploaded = []
    errors = []

    for file in files:
        if not file.filename:
            errors.append({"filename": "unknown", "error": "No filename provided"})
            continue

        # Sanitize filename to prevent path traversal attacks
        safe_filename = sanitize_filename(file.filename)
        if not safe_filename or safe_filename == "unnamed_file":
            errors.append({"filename": file.filename, "error": "Invalid filename"})
            continue

        ext = Path(safe_filename).suffix.lower()
        if ext not in allowed_extensions:
            errors.append({
                "filename": file.filename,
                "error": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            })
            continue

        # Save file with sanitized name
        target_path = target_dir / safe_filename

        # Handle duplicates by appending number
        counter = 1
        original_stem = target_path.stem
        while target_path.exists():
            target_path = target_dir / f"{original_stem}_{counter}{ext}"
            counter += 1

        try:
            content = await file.read()

            # Verify file content matches an audio type (security check)
            # Skip MIDI files as filetype library doesn't detect them well
            if ext not in {".mid", ".midi"}:
                detected = filetype.guess(content)
                if detected is None or detected.mime not in VALID_AUDIO_MIMES:
                    detected_type = detected.mime if detected else "unknown"
                    errors.append({
                        "filename": file.filename,
                        "error": f"File content does not match audio type (detected: {detected_type})"
                    })
                    continue

            with open(target_path, "wb") as f:
                f.write(content)

            uploaded.append({
                "filename": file.filename,
                "saved_as": target_path.name,
                "path": str(target_path),
                "size_bytes": len(content),
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    # Trigger background scan to index new files
    if uploaded and background_tasks:
        indexer = get_indexer()
        if not indexer.is_scanning:
            background_tasks.add_task(indexer.run_scan)

    return {
        "uploaded": len(uploaded),
        "errors": len(errors),
        "files": uploaded,
        "error_details": errors if errors else None,
    }


@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(sample_id: int) -> SampleResponse:
    """
    Get a single sample by ID.
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM samples WHERE id = ?", (sample_id,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Sample not found")

    return sample_to_response(Sample.from_row(dict(row)))


def _needs_transcoding(filepath: Path) -> bool:
    """Check if a file needs transcoding for browser playback."""
    ext = filepath.suffix.lower()
    return ext in TRANSCODE_EXTENSIONS


def _is_midi_file(filepath: Path) -> bool:
    """Check if a file is a MIDI file that needs synthesis."""
    ext = filepath.suffix.lower()
    return ext in MIDI_EXTENSIONS


# Transcode cache directory (under /data for persistence)
TRANSCODE_CACHE_DIR = Path("/data/transcode_cache")

# MIDI cache directory (under /data for persistence) - defined early for cache cleanup
MIDI_CACHE_DIR = Path("/data/midi_cache")

# Cache size limits (in bytes)
MAX_CACHE_SIZE_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB total
MAX_SINGLE_CACHE_SIZE_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB per cache


def _cleanup_cache_if_needed(cache_dir: Path, max_size: int = MAX_SINGLE_CACHE_SIZE_BYTES) -> None:
    """
    Clean up cache directory if it exceeds the size limit.
    Uses LRU eviction based on file access time.
    """
    if not cache_dir.exists():
        return

    try:
        # Get all files with their sizes and access times
        files = []
        total_size = 0
        for f in cache_dir.iterdir():
            if f.is_file():
                stat = f.stat()
                files.append((f, stat.st_size, stat.st_atime))
                total_size += stat.st_size

        # If under limit, nothing to do
        if total_size <= max_size:
            return

        # Sort by access time (oldest first) for LRU eviction
        files.sort(key=lambda x: x[2])

        # Delete oldest files until under limit (target 80% of max)
        target_size = int(max_size * 0.8)
        deleted_count = 0
        deleted_size = 0

        for filepath, size, _ in files:
            if total_size <= target_size:
                break
            try:
                filepath.unlink()
                total_size -= size
                deleted_count += 1
                deleted_size += size
            except OSError as e:
                logger.warning(f"Failed to delete cache file {filepath}: {e}")

        if deleted_count > 0:
            logger.info(
                f"Cache cleanup: deleted {deleted_count} files "
                f"({deleted_size / 1024 / 1024:.1f} MB) from {cache_dir}"
            )
    except Exception as e:
        logger.error(f"Cache cleanup failed for {cache_dir}: {e}")


def _get_transcode_cache_path(filepath: Path) -> Path:
    """
    Get the cache path for a transcoded audio file.
    Uses a hash of the filepath and modification time to ensure cache invalidation
    when the source file changes.
    """
    import hashlib

    # Create a unique key based on filepath and modification time
    mtime = filepath.stat().st_mtime
    cache_key = f"{filepath}:{mtime}"
    cache_hash = hashlib.md5(cache_key.encode()).hexdigest()

    # Ensure cache directory exists
    TRANSCODE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    return TRANSCODE_CACHE_DIR / f"{cache_hash}.wav"


def _transcode_to_wav(filepath: Path):
    """
    Transcode audio file to WAV format using ffmpeg.
    Returns a generator that yields WAV data chunks.

    Uses a persistent cache to avoid re-transcoding the same file.
    Cache is invalidated when the source file is modified.
    """
    import tempfile
    import os

    # Check if we have a cached version
    cache_path = _get_transcode_cache_path(filepath)

    if cache_path.exists() and cache_path.stat().st_size > 0:
        logger.debug(f"Using cached transcode: {cache_path}")
        # Stream from cache
        with open(cache_path, "rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                yield chunk
        return

    # No cache - transcode to a temp file, then move to cache
    temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd)

    try:
        cmd = [
            "ffmpeg",
            "-i", str(filepath),
            "-f", "wav",          # Output format
            "-acodec", "pcm_s16le",  # 16-bit PCM
            "-ar", "44100",       # 44.1kHz sample rate
            "-ac", "2",           # Stereo
            "-y",                 # Overwrite output
            "-loglevel", "error", # Suppress verbose output
            temp_path             # Output to temp file
        ]

        logger.debug(f"Transcoding: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=120  # 2 minute timeout for transcoding
        )

        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="ignore")
            logger.error(f"ffmpeg transcoding failed: {stderr}")
            return

        # Check if file was created and has content
        temp_file_path = Path(temp_path)
        if not temp_file_path.exists() or temp_file_path.stat().st_size == 0:
            logger.error(f"Transcoding produced empty output for {filepath}")
            return

        # Move temp file to cache location
        import shutil
        try:
            shutil.move(temp_path, cache_path)
            logger.info(f"Cached transcode: {filepath} -> {cache_path}")
            temp_path = None  # Don't delete in finally block
            # Clean up cache if it's getting too large
            _cleanup_cache_if_needed(TRANSCODE_CACHE_DIR)
        except Exception as e:
            logger.warning(f"Failed to cache transcode: {e}")
            # Fall through to stream from temp file

        # Stream the transcoded WAV file (from cache or temp)
        stream_path = cache_path if cache_path.exists() else temp_path
        if stream_path:
            with open(stream_path, "rb") as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk

    except subprocess.TimeoutExpired:
        logger.error(f"Transcoding timed out for {filepath}")
    except Exception as e:
        logger.error(f"Error transcoding {filepath}: {e}")
        raise
    finally:
        # Clean up temp file if it wasn't moved to cache
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass


# Default soundfont location (Debian/Ubuntu package: fluid-soundfont-gm)
SOUNDFONT_PATHS = [
    "/usr/share/sounds/sf2/FluidR3_GM.sf2",
    "/usr/share/soundfonts/FluidR3_GM.sf2",
    "/usr/share/sounds/sf2/default.sf2",
]


def _find_soundfont() -> str | None:
    """Find an available soundfont file."""
    for path in SOUNDFONT_PATHS:
        if Path(path).exists():
            return path
    return None


def _get_midi_cache_path(filepath: Path) -> Path:
    """
    Get the cache path for a MIDI file's rendered WAV.
    Uses a hash of the filepath and modification time to ensure cache invalidation
    when the source file changes.
    """
    import hashlib

    # Create a unique key based on filepath and modification time
    mtime = filepath.stat().st_mtime
    cache_key = f"{filepath}:{mtime}"
    cache_hash = hashlib.md5(cache_key.encode()).hexdigest()

    # Ensure cache directory exists
    MIDI_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    return MIDI_CACHE_DIR / f"{cache_hash}.wav"


def _synthesize_midi_to_wav(filepath: Path):
    """
    Synthesize MIDI file to WAV format using FluidSynth.
    Returns a generator that yields WAV data chunks.

    Uses a persistent cache to avoid re-synthesizing the same MIDI file.
    Cache is invalidated when the source MIDI file is modified.
    """
    import tempfile
    import os

    soundfont = _find_soundfont()

    if not soundfont:
        logger.error("No soundfont found for MIDI synthesis")
        return

    # Check if we have a cached version
    cache_path = _get_midi_cache_path(filepath)

    if cache_path.exists() and cache_path.stat().st_size > 0:
        logger.debug(f"Using cached MIDI synthesis: {cache_path}")
        # Stream from cache
        with open(cache_path, "rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                yield chunk
        return

    # No cache - synthesize to a temp file, then move to cache
    temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd)

    try:
        # Use FluidSynth to render MIDI to temp file
        cmd = [
            "fluidsynth",
            "-ni",                # Non-interactive, no shell
            "-g", "1.0",          # Gain
            "-R", "0",            # No reverb
            "-C", "0",            # No chorus
            "-r", "44100",        # Sample rate
            "-T", "wav",          # Output format
            "-F", temp_path,      # Output to temp file
            soundfont,
            str(filepath)
        ]

        logger.debug(f"Synthesizing MIDI: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=60  # 60 second timeout for MIDI rendering
        )

        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="ignore")
            logger.error(f"MIDI synthesis failed: {stderr}")
            return

        # Check if file was created and has content
        temp_file_path = Path(temp_path)
        if not temp_file_path.exists() or temp_file_path.stat().st_size == 0:
            logger.error(f"MIDI synthesis produced empty output for {filepath}")
            return

        # Move temp file to cache location
        import shutil
        try:
            shutil.move(temp_path, cache_path)
            logger.info(f"Cached MIDI synthesis: {filepath} -> {cache_path}")
            temp_path = None  # Don't delete in finally block
            # Clean up cache if it's getting too large
            _cleanup_cache_if_needed(MIDI_CACHE_DIR)
        except Exception as e:
            logger.warning(f"Failed to cache MIDI synthesis: {e}")
            # Fall through to stream from temp file

        # Stream the rendered WAV file (from cache or temp)
        stream_path = cache_path if cache_path.exists() else temp_path
        if stream_path:
            with open(stream_path, "rb") as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk

    except subprocess.TimeoutExpired:
        logger.error(f"MIDI synthesis timed out for {filepath}")
    except FileNotFoundError:
        logger.error("FluidSynth not found - install fluidsynth package for MIDI playback")
    except Exception as e:
        logger.error(f"Error synthesizing MIDI {filepath}: {e}")
        raise
    finally:
        # Clean up temp file if it wasn't moved to cache
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass


@router.get("/{sample_id}/audio")
async def stream_audio(
    sample_id: int,
    download: bool = Query(False, description="Force download with Content-Disposition attachment"),
    transcode: bool = Query(True, description="Transcode unsupported formats (CAF/ALAC/MIDI) to WAV"),
):
    """
    Stream audio file for playback or download.
    CAF/ALAC files are automatically transcoded to WAV for browser compatibility.
    MIDI files are synthesized to WAV for playback.
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT filepath, filename FROM samples WHERE id = ?", (sample_id,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Sample not found")

    filepath = Path(row["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Check if MIDI synthesis is needed
    if transcode and _is_midi_file(filepath):
        # Return synthesized WAV stream for MIDI
        return StreamingResponse(
            _synthesize_midi_to_wav(filepath),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'{"attachment" if download else "inline"}; filename="{filepath.stem}.wav"',
                "Accept-Ranges": "none",  # Synthesized streams don't support ranges
            }
        )

    # Check if audio transcoding is needed (CAF/ALAC)
    if transcode and _needs_transcoding(filepath):
        # Return transcoded WAV stream
        return StreamingResponse(
            _transcode_to_wav(filepath),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'{"attachment" if download else "inline"}; filename="{filepath.stem}.wav"',
                "Accept-Ranges": "none",  # Transcoded streams don't support ranges
            }
        )

    # Determine content type for original file
    content_type, _ = mimetypes.guess_type(str(filepath))
    if not content_type:
        content_type = "application/octet-stream"

    # Set content disposition based on download parameter
    content_disposition = "attachment" if download else "inline"

    return FileResponse(
        path=filepath,
        media_type=content_type,
        filename=filepath.name,
        content_disposition_type=content_disposition,
    )
