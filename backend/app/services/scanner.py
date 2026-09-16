"""File system scanner for audio files."""

import os
import logging
from pathlib import Path
from typing import Generator, Optional
from dataclasses import dataclass
from datetime import datetime

from ..config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class ScannedFile:
    """Information about a scanned audio file."""

    filepath: str
    filename: str
    directory: str
    file_extension: str
    file_size_bytes: int
    file_modified_at: datetime


def scan_directory(
    root_path: Optional[str] = None,
) -> Generator[ScannedFile, None, None]:
    """
    Scan a directory recursively for audio files.

    Args:
        root_path: Path to scan. Defaults to configured audio path.

    Yields:
        ScannedFile objects for each audio file found.
    """
    settings = get_settings()
    root = Path(root_path or settings.audio_path)

    if not root.exists():
        logger.error(f"Audio path does not exist: {root}")
        return

    if not root.is_dir():
        logger.error(f"Audio path is not a directory: {root}")
        return

    logger.info(f"Scanning directory: {root}")
    extensions = settings.audio_extensions

    file_count = 0
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            filepath = Path(dirpath) / filename
            ext = filepath.suffix.lower()

            if ext not in extensions:
                continue

            try:
                stat = filepath.stat()
                file_count += 1

                yield ScannedFile(
                    filepath=str(filepath),
                    filename=filename,
                    directory=str(Path(dirpath).relative_to(root)),
                    file_extension=ext,
                    file_size_bytes=stat.st_size,
                    file_modified_at=datetime.fromtimestamp(stat.st_mtime),
                )
            except OSError as e:
                logger.warning(f"Error scanning file {filepath}: {e}")
                continue

    logger.info(f"Scan complete. Found {file_count} audio files.")


def count_files(root_path: Optional[str] = None) -> int:
    """
    Count total audio files in directory without full scan.

    Args:
        root_path: Path to count. Defaults to configured audio path.

    Returns:
        Total count of audio files.
    """
    settings = get_settings()
    root = Path(root_path or settings.audio_path)

    if not root.exists() or not root.is_dir():
        return 0

    extensions = settings.audio_extensions
    count = 0

    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if Path(filename).suffix.lower() in extensions:
                count += 1

    return count


def get_audio_metadata(filepath: str) -> dict:
    """
    Extract audio metadata from a file using mutagen, with ffprobe fallback.

    For formats not supported by mutagen (like CAF with ALAC), uses ffprobe.
    For MIDI files, uses mido library.

    Args:
        filepath: Path to audio file.

    Returns:
        Dict with duration_seconds, sample_rate, channels, bit_depth, tempo_bpm, time_signature.
    """
    # Check if MIDI file
    ext = Path(filepath).suffix.lower()
    if ext in {".mid", ".midi"}:
        return _get_midi_metadata(filepath)

    result = {
        "duration_seconds": None,
        "sample_rate": None,
        "channels": None,
        "bit_depth": None,
    }

    # Try mutagen first (faster for supported formats)
    try:
        from mutagen import File as MutagenFile

        audio = MutagenFile(filepath)
        if audio is not None:
            # Get duration
            if hasattr(audio, "info") and hasattr(audio.info, "length"):
                result["duration_seconds"] = round(audio.info.length, 2)

            # Get sample rate
            if hasattr(audio, "info") and hasattr(audio.info, "sample_rate"):
                result["sample_rate"] = audio.info.sample_rate

            # Get channels
            if hasattr(audio, "info") and hasattr(audio.info, "channels"):
                result["channels"] = audio.info.channels

            # Get bit depth (WAV files)
            if hasattr(audio, "info") and hasattr(audio.info, "bits_per_sample"):
                result["bit_depth"] = audio.info.bits_per_sample

            # If we got duration, mutagen worked - return results
            if result["duration_seconds"] is not None:
                return result

    except ImportError:
        logger.debug("mutagen not installed, trying ffprobe")
    except Exception as e:
        logger.debug(f"mutagen failed for {filepath}: {e}, trying ffprobe")

    # Fallback to ffprobe for CAF/ALAC and other unsupported formats
    ffprobe_result = _get_metadata_with_ffprobe(filepath)
    if ffprobe_result:
        # Merge ffprobe results (only fill in missing values)
        for key, value in ffprobe_result.items():
            if result[key] is None and value is not None:
                result[key] = value

    return result


def _get_metadata_with_ffprobe(filepath: str) -> dict:
    """
    Extract audio metadata using ffprobe (part of ffmpeg).

    Supports CAF files with ALAC and other codecs that mutagen doesn't handle.

    Args:
        filepath: Path to audio file.

    Returns:
        Dict with duration_seconds, sample_rate, channels, bit_depth.
    """
    import subprocess
    import json

    result = {
        "duration_seconds": None,
        "sample_rate": None,
        "channels": None,
        "bit_depth": None,
    }

    try:
        # Run ffprobe to get stream information in JSON format
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            filepath
        ]

        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10
        )

        if proc.returncode != 0:
            logger.debug(f"ffprobe failed for {filepath}: {proc.stderr}")
            return result

        data = json.loads(proc.stdout)

        # Get format-level duration
        if "format" in data and "duration" in data["format"]:
            result["duration_seconds"] = round(float(data["format"]["duration"]), 2)

        # Find audio stream for detailed info
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "audio":
                # Sample rate
                if "sample_rate" in stream:
                    result["sample_rate"] = int(stream["sample_rate"])

                # Channels
                if "channels" in stream:
                    result["channels"] = int(stream["channels"])

                # Bit depth (bits_per_raw_sample or bits_per_sample)
                if "bits_per_raw_sample" in stream:
                    result["bit_depth"] = int(stream["bits_per_raw_sample"])
                elif "bits_per_sample" in stream and stream["bits_per_sample"] > 0:
                    result["bit_depth"] = int(stream["bits_per_sample"])

                # Stream-level duration (more accurate for some formats)
                if result["duration_seconds"] is None and "duration" in stream:
                    result["duration_seconds"] = round(float(stream["duration"]), 2)

                break  # Use first audio stream

    except FileNotFoundError:
        logger.debug("ffprobe not found in PATH, skipping metadata extraction")
    except subprocess.TimeoutExpired:
        logger.debug(f"ffprobe timed out for {filepath}")
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.debug(f"Error parsing ffprobe output for {filepath}: {e}")
    except Exception as e:
        logger.debug(f"Error running ffprobe for {filepath}: {e}")

    return result


def _get_midi_metadata(filepath: str) -> dict:
    """
    Extract metadata from a MIDI file using mido.

    Args:
        filepath: Path to MIDI file.

    Returns:
        Dict with duration_seconds, tempo_bpm, time_signature.
    """
    result = {
        "duration_seconds": None,
        "sample_rate": None,  # Not applicable for MIDI
        "channels": None,  # Will be set to track count
        "bit_depth": None,  # Not applicable for MIDI
        "tempo_bpm": None,
        "time_signature": None,
    }

    try:
        import mido

        mid = mido.MidiFile(filepath)

        # Get duration
        result["duration_seconds"] = round(mid.length, 2)

        # Get number of tracks (use as "channels")
        result["channels"] = len(mid.tracks)

        # Extract tempo and time signature from meta messages
        for track in mid.tracks:
            for msg in track:
                if msg.type == "set_tempo":
                    # Convert microseconds per beat to BPM
                    result["tempo_bpm"] = round(mido.tempo2bpm(msg.tempo), 1)
                elif msg.type == "time_signature":
                    result["time_signature"] = f"{msg.numerator}/{msg.denominator}"

                # Stop after finding both
                if result["tempo_bpm"] and result["time_signature"]:
                    break

    except ImportError:
        logger.debug("mido not installed, skipping MIDI metadata extraction")
    except Exception as e:
        logger.debug(f"Error reading MIDI file {filepath}: {e}")

    return result
