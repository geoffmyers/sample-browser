"""Image discovery service for sample directories."""

import os
import logging
from pathlib import Path
from typing import Optional
from functools import lru_cache

from ..config import get_settings

logger = logging.getLogger(__name__)

# Common image file extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

# Common cover art filenames (case-insensitive)
COVER_ART_NAMES = {
    "cover",
    "artwork",
    "folder",
    "front",
    "album",
    "thumbnail",
    "image",
    "pack",
}


def _is_cover_art_candidate(filename: str) -> bool:
    """Check if filename looks like cover art."""
    name_lower = filename.lower()
    stem = Path(filename).stem.lower()

    # Check if the filename (without extension) matches common cover art names
    if stem in COVER_ART_NAMES:
        return True

    # Check if filename contains common cover art keywords
    for name in COVER_ART_NAMES:
        if name in name_lower:
            return True

    return False


def find_directory_image(directory: str) -> Optional[str]:
    """
    Find an image file in a directory that could be used as cover art.

    Searches for common cover art filenames first, then falls back to
    any image file in the directory.

    Args:
        directory: Relative directory path from audio root.

    Returns:
        Absolute path to image file, or None if not found.
    """
    settings = get_settings()
    audio_root = Path(settings.audio_path)

    # Handle root directory
    if not directory or directory == ".":
        target_dir = audio_root
    else:
        target_dir = audio_root / directory

    if not target_dir.exists() or not target_dir.is_dir():
        return None

    try:
        # Get all image files in the directory
        images = []
        cover_candidates = []

        for entry in os.scandir(target_dir):
            if not entry.is_file():
                continue

            ext = Path(entry.name).suffix.lower()
            if ext not in IMAGE_EXTENSIONS:
                continue

            images.append(entry.path)

            # Check if this looks like cover art
            if _is_cover_art_candidate(entry.name):
                cover_candidates.append(entry.path)

        # Prefer cover art candidates
        if cover_candidates:
            return cover_candidates[0]

        # Fall back to first image found
        if images:
            return images[0]

    except OSError as e:
        logger.debug(f"Error scanning directory {target_dir}: {e}")

    return None


def find_sample_image(filepath: str, directory: str) -> Optional[str]:
    """
    Find an image for a sample, searching the sample's directory
    and parent directories.

    Args:
        filepath: Full path to the sample file.
        directory: Relative directory path from audio root.

    Returns:
        Absolute path to image file, or None if not found.
    """
    settings = get_settings()
    audio_root = Path(settings.audio_path)

    # Start with the sample's directory
    current_dir = directory

    # Search up to 3 levels up
    for _ in range(4):
        image = find_directory_image(current_dir)
        if image:
            return image

        # Move up one directory
        if not current_dir or current_dir == ".":
            break

        parent = str(Path(current_dir).parent)
        if parent == "." or parent == current_dir:
            break

        current_dir = parent

    return None


# Cache for directory -> image path mapping
# This avoids repeated filesystem scans for the same directory
@lru_cache(maxsize=1000)
def get_cached_directory_image(directory: str) -> Optional[str]:
    """
    Get cached image path for a directory.

    Uses LRU cache to avoid repeated filesystem scans.
    """
    return find_directory_image(directory)


def clear_image_cache():
    """Clear the directory image cache."""
    get_cached_directory_image.cache_clear()
