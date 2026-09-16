"""Sample data models."""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class ParsedFilename:
    """Parsed information from an audio filename."""

    original_filename: str
    instrument: Optional[str] = None
    descriptors: list[str] = field(default_factory=list)
    tempo_bpm: Optional[float] = None
    key_signature: Optional[str] = None
    scale_type: Optional[str] = None
    genre: Optional[str] = None
    # Extended classification
    is_loop: Optional[bool] = None
    is_processed: Optional[bool] = None
    time_signature: Optional[str] = None

    @property
    def has_tempo(self) -> bool:
        return self.tempo_bpm is not None

    @property
    def has_key(self) -> bool:
        return self.key_signature is not None

    @property
    def full_key(self) -> Optional[str]:
        """Return full key like 'C major' or 'A minor'."""
        if self.key_signature:
            scale = self.scale_type or "major"
            return f"{self.key_signature} {scale}"
        return None


@dataclass
class Sample:
    """Audio sample record."""

    id: int
    filepath: str
    filename: str
    directory: str
    file_extension: str
    file_size_bytes: Optional[int] = None

    # Parsed metadata
    instrument: Optional[str] = None
    descriptors: list[str] = field(default_factory=list)
    tempo_bpm: Optional[float] = None
    key_signature: Optional[str] = None
    scale_type: Optional[str] = None
    genre: Optional[str] = None

    # Audio metadata
    duration_seconds: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    bit_depth: Optional[int] = None
    length_bars: Optional[float] = None

    # Extended sample classification
    sample_type: str = "audio"  # 'audio' or 'midi'
    is_loop: Optional[bool] = None  # True=loop, False=one-shot
    is_processed: Optional[bool] = None  # True=processed, False=dry
    is_polyphonic: Optional[bool] = None  # True=polyphonic, False=monophonic
    time_signature: Optional[str] = None  # e.g., '4/4', '3/4'

    # Timestamps
    file_modified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    indexed_at: Optional[datetime] = None

    @property
    def full_key(self) -> Optional[str]:
        """Return full key like 'C major' or 'A minor'."""
        if self.key_signature:
            scale = self.scale_type or "major"
            return f"{self.key_signature} {scale}"
        return None

    @classmethod
    def from_row(cls, row: dict) -> "Sample":
        """Create Sample from database row."""
        import json

        descriptors = []
        if row.get("descriptors_json"):
            try:
                descriptors = json.loads(row["descriptors_json"])
            except (json.JSONDecodeError, TypeError):
                descriptors = []

        # Convert SQLite integers to booleans for boolean fields
        is_loop = row.get("is_loop")
        is_processed = row.get("is_processed")
        is_polyphonic = row.get("is_polyphonic")

        return cls(
            id=row["id"],
            filepath=row["filepath"],
            filename=row["filename"],
            directory=row["directory"],
            file_extension=row["file_extension"],
            file_size_bytes=row.get("file_size_bytes"),
            instrument=row.get("instrument"),
            descriptors=descriptors,
            tempo_bpm=row.get("tempo_bpm"),
            key_signature=row.get("key_signature"),
            scale_type=row.get("scale_type"),
            genre=row.get("genre"),
            duration_seconds=row.get("duration_seconds"),
            sample_rate=row.get("sample_rate"),
            channels=row.get("channels"),
            bit_depth=row.get("bit_depth"),
            length_bars=row.get("length_bars"),
            sample_type=row.get("sample_type") or "audio",
            is_loop=bool(is_loop) if is_loop is not None else None,
            is_processed=bool(is_processed) if is_processed is not None else None,
            is_polyphonic=bool(is_polyphonic) if is_polyphonic is not None else None,
            time_signature=row.get("time_signature"),
            file_modified_at=row.get("file_modified_at"),
            created_at=row.get("created_at"),
            indexed_at=row.get("indexed_at"),
        )
