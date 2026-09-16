"""Database indexer service."""

import json
import logging
import threading
from datetime import datetime
from typing import Optional, Callable

from ..database.connection import get_db
from ..config import get_settings
from .scanner import scan_directory, count_files, get_audio_metadata, ScannedFile
from .parser import parse_filename

logger = logging.getLogger(__name__)


class Indexer:
    """Service to index audio files into the database."""

    def __init__(self):
        self._scan_lock = threading.Lock()
        self._is_scanning = False
        self._cancel_requested = False

    @property
    def is_scanning(self) -> bool:
        return self._is_scanning

    def cancel_scan(self):
        """Request cancellation of current scan."""
        self._cancel_requested = True

    def get_scan_status(self) -> dict:
        """Get current scan status from database."""
        with get_db() as conn:
            row = conn.execute(
                """
                SELECT scan_status, scan_progress_percent, scan_files_scanned,
                       scan_files_total, last_scan_at, scan_error
                FROM index_stats WHERE id = 1
                """
            ).fetchone()

            if row:
                return {
                    "status": row["scan_status"] or "idle",
                    "progress_percent": row["scan_progress_percent"],
                    "files_scanned": row["scan_files_scanned"] or 0,
                    "files_total": row["scan_files_total"] or 0,
                    "started_at": row["last_scan_at"],
                    "error_message": row["scan_error"],
                }

            return {
                "status": "idle",
                "progress_percent": 0,
                "files_scanned": 0,
                "files_total": 0,
                "started_at": None,
                "error_message": None,
            }

    def run_scan(
        self,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        extract_audio_metadata: bool = True,
        force_reparse: bool = False,
    ) -> dict:
        """
        Run a full scan of the audio directory.

        Args:
            progress_callback: Optional callback(scanned, total) for progress updates.
            extract_audio_metadata: Whether to extract duration/sample_rate from files.
            force_reparse: If True, re-parse all existing files even if unchanged.

        Returns:
            Dict with scan statistics.
        """
        if not self._scan_lock.acquire(blocking=False):
            return {"error": "Scan already in progress"}

        try:
            self._is_scanning = True
            self._cancel_requested = False

            return self._do_scan(progress_callback, extract_audio_metadata, force_reparse)

        finally:
            self._is_scanning = False
            self._scan_lock.release()

    def _do_scan(
        self,
        progress_callback: Optional[Callable[[int, int], None]],
        extract_audio_metadata: bool,
        force_reparse: bool = False,
    ) -> dict:
        """Perform the actual scan."""
        settings = get_settings()
        start_time = datetime.now()

        # Count total files first
        total_files = count_files()
        logger.info(f"Starting scan of {total_files} files")

        # Update status to scanning
        self._update_scan_status(
            status="scanning",
            files_total=total_files,
            files_scanned=0,
            progress_percent=0,
        )

        # Track existing files
        existing_paths = self._get_existing_paths()
        seen_paths = set()

        scanned = 0
        added = 0
        updated = 0
        errors = 0

        try:
            for scanned_file in scan_directory():
                if self._cancel_requested:
                    logger.info("Scan cancelled by user")
                    break

                seen_paths.add(scanned_file.filepath)
                scanned += 1

                try:
                    if scanned_file.filepath in existing_paths:
                        # Check if file was modified or force reparse is enabled
                        if force_reparse or self._file_was_modified(scanned_file):
                            self._update_sample(scanned_file, extract_audio_metadata)
                            updated += 1
                    else:
                        self._insert_sample(scanned_file, extract_audio_metadata)
                        added += 1

                except Exception as e:
                    logger.error(f"Error indexing {scanned_file.filepath}: {e}")
                    errors += 1

                # Update progress
                if scanned % 100 == 0 or scanned == total_files:
                    progress = (scanned / total_files * 100) if total_files > 0 else 100
                    self._update_scan_status(
                        files_scanned=scanned,
                        progress_percent=progress,
                    )
                    if progress_callback:
                        progress_callback(scanned, total_files)

            # Remove deleted files
            deleted = self._remove_missing_files(existing_paths, seen_paths)

            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()

            # Update final status
            self._update_scan_status(
                status="complete" if not self._cancel_requested else "cancelled",
                files_scanned=scanned,
                progress_percent=100,
                last_scan_duration=duration,
            )

            # Update stats
            self._update_stats()

            result = {
                "status": "complete" if not self._cancel_requested else "cancelled",
                "total_files": total_files,
                "scanned": scanned,
                "added": added,
                "updated": updated,
                "deleted": deleted,
                "errors": errors,
                "duration_seconds": round(duration, 2),
            }

            logger.info(f"Scan complete: {result}")
            return result

        except Exception as e:
            logger.error(f"Scan failed: {e}")
            self._update_scan_status(status="error", scan_error=str(e))
            return {"error": str(e)}

    def _get_existing_paths(self) -> set:
        """Get all existing file paths from database."""
        with get_db() as conn:
            rows = conn.execute("SELECT filepath FROM samples").fetchall()
            return {row["filepath"] for row in rows}

    def _file_was_modified(self, scanned_file: ScannedFile) -> bool:
        """Check if file was modified since last index."""
        with get_db() as conn:
            row = conn.execute(
                "SELECT file_modified_at, file_size_bytes FROM samples WHERE filepath = ?",
                (scanned_file.filepath,),
            ).fetchone()

            if not row:
                return True

            # Compare modification time and size
            return (
                row["file_size_bytes"] != scanned_file.file_size_bytes
                or row["file_modified_at"] != scanned_file.file_modified_at.isoformat()
            )

    def _calculate_length_bars(
        self, tempo_bpm: Optional[float], duration_seconds: Optional[float]
    ) -> Optional[float]:
        """
        Calculate length in bars based on tempo and duration.
        Assumes 4/4 time signature: bars = (tempo / 60) * duration / 4
        """
        if tempo_bpm and duration_seconds:
            beats = (tempo_bpm / 60) * duration_seconds
            bars = beats / 4  # Assuming 4 beats per bar (4/4 time)
            return round(bars, 2)
        return None

    def _insert_sample(self, scanned_file: ScannedFile, extract_metadata: bool):
        """Insert a new sample into the database."""
        # Pass full filepath to parser to extract genre from path
        parsed = parse_filename(scanned_file.filepath)

        audio_meta = {}
        if extract_metadata:
            audio_meta = get_audio_metadata(scanned_file.filepath)

        # Calculate length in bars
        duration = audio_meta.get("duration_seconds")
        # Use tempo from MIDI metadata if available, otherwise from filename parsing
        tempo = audio_meta.get("tempo_bpm") or parsed.tempo_bpm
        length_bars = self._calculate_length_bars(tempo, duration)

        # Use time signature from MIDI metadata if available
        time_signature = audio_meta.get("time_signature") or parsed.time_signature

        # Determine sample type from file extension
        sample_type = "midi" if scanned_file.file_extension.lower() in (".mid", ".midi") else "audio"

        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO samples (
                    filepath, filename, directory, file_extension, file_size_bytes,
                    instrument, descriptors_json, tempo_bpm, key_signature, scale_type,
                    genre, duration_seconds, sample_rate, channels, bit_depth, length_bars,
                    sample_type, is_loop, is_processed, time_signature,
                    file_modified_at, parse_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'parsed')
                """,
                (
                    scanned_file.filepath,
                    scanned_file.filename,
                    scanned_file.directory,
                    scanned_file.file_extension,
                    scanned_file.file_size_bytes,
                    parsed.instrument,
                    json.dumps(parsed.descriptors) if parsed.descriptors else None,
                    tempo,
                    parsed.key_signature,
                    parsed.scale_type,
                    parsed.genre,
                    duration,
                    audio_meta.get("sample_rate"),
                    audio_meta.get("channels"),
                    audio_meta.get("bit_depth"),
                    length_bars,
                    sample_type,
                    1 if parsed.is_loop is True else (0 if parsed.is_loop is False else None),
                    1 if parsed.is_processed is True else (0 if parsed.is_processed is False else None),
                    time_signature,
                    scanned_file.file_modified_at.isoformat(),
                ),
            )
            conn.commit()

    def _update_sample(self, scanned_file: ScannedFile, extract_metadata: bool):
        """Update an existing sample in the database."""
        # Pass full filepath to parser to extract genre from path
        parsed = parse_filename(scanned_file.filepath)

        audio_meta = {}
        if extract_metadata:
            audio_meta = get_audio_metadata(scanned_file.filepath)

        # Calculate length in bars
        duration = audio_meta.get("duration_seconds")
        # Use tempo from MIDI metadata if available, otherwise from filename parsing
        tempo = audio_meta.get("tempo_bpm") or parsed.tempo_bpm
        length_bars = self._calculate_length_bars(tempo, duration)

        # Use time signature from MIDI metadata if available
        time_signature = audio_meta.get("time_signature") or parsed.time_signature

        # Determine sample type from file extension
        sample_type = "midi" if scanned_file.file_extension.lower() in (".mid", ".midi") else "audio"

        with get_db() as conn:
            conn.execute(
                """
                UPDATE samples SET
                    filename = ?, directory = ?, file_extension = ?, file_size_bytes = ?,
                    instrument = ?, descriptors_json = ?, tempo_bpm = ?,
                    key_signature = ?, scale_type = ?, genre = ?,
                    duration_seconds = ?, sample_rate = ?, channels = ?, bit_depth = ?,
                    length_bars = ?, sample_type = ?, is_loop = ?, is_processed = ?,
                    time_signature = ?, file_modified_at = ?, indexed_at = CURRENT_TIMESTAMP
                WHERE filepath = ?
                """,
                (
                    scanned_file.filename,
                    scanned_file.directory,
                    scanned_file.file_extension,
                    scanned_file.file_size_bytes,
                    parsed.instrument,
                    json.dumps(parsed.descriptors) if parsed.descriptors else None,
                    tempo,
                    parsed.key_signature,
                    parsed.scale_type,
                    parsed.genre,
                    duration,
                    audio_meta.get("sample_rate"),
                    audio_meta.get("channels"),
                    audio_meta.get("bit_depth"),
                    length_bars,
                    sample_type,
                    1 if parsed.is_loop is True else (0 if parsed.is_loop is False else None),
                    1 if parsed.is_processed is True else (0 if parsed.is_processed is False else None),
                    time_signature,
                    scanned_file.file_modified_at.isoformat(),
                    scanned_file.filepath,
                ),
            )
            conn.commit()

    def _remove_missing_files(self, existing_paths: set, seen_paths: set) -> int:
        """Remove samples for files that no longer exist."""
        missing = existing_paths - seen_paths
        if not missing:
            return 0

        with get_db() as conn:
            for filepath in missing:
                conn.execute("DELETE FROM samples WHERE filepath = ?", (filepath,))
            conn.commit()

        logger.info(f"Removed {len(missing)} deleted files from index")
        return len(missing)

    def _update_scan_status(
        self,
        status: Optional[str] = None,
        files_scanned: Optional[int] = None,
        files_total: Optional[int] = None,
        progress_percent: Optional[float] = None,
        last_scan_duration: Optional[float] = None,
        scan_error: Optional[str] = None,
    ):
        """Update scan status in database."""
        updates = []
        params = []

        if status is not None:
            updates.append("scan_status = ?")
            params.append(status)

        if files_scanned is not None:
            updates.append("scan_files_scanned = ?")
            params.append(files_scanned)

        if files_total is not None:
            updates.append("scan_files_total = ?")
            params.append(files_total)

        if progress_percent is not None:
            updates.append("scan_progress_percent = ?")
            params.append(progress_percent)

        if last_scan_duration is not None:
            updates.append("last_scan_duration_seconds = ?")
            params.append(last_scan_duration)
            updates.append("last_scan_at = CURRENT_TIMESTAMP")

        if scan_error is not None:
            updates.append("scan_error = ?")
            params.append(scan_error)

        updates.append("updated_at = CURRENT_TIMESTAMP")

        if updates:
            with get_db() as conn:
                conn.execute(
                    f"UPDATE index_stats SET {', '.join(updates)} WHERE id = 1",
                    params,
                )
                conn.commit()

    def _update_stats(self):
        """Update aggregate statistics."""
        with get_db() as conn:
            total = conn.execute("SELECT COUNT(*) FROM samples").fetchone()[0]
            dirs = conn.execute(
                "SELECT COUNT(DISTINCT directory) FROM samples"
            ).fetchone()[0]

            conn.execute(
                """
                UPDATE index_stats SET
                    total_samples = ?,
                    total_directories = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
                """,
                (total, dirs),
            )
            conn.commit()


# Global indexer instance
_indexer: Optional[Indexer] = None


def get_indexer() -> Indexer:
    """Get or create the global indexer instance."""
    global _indexer
    if _indexer is None:
        _indexer = Indexer()
    return _indexer
