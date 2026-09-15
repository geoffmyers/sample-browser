"""Search and response models for API."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class SampleResponse(BaseModel):
    """Single sample response."""

    id: int
    filepath: str
    filename: str
    directory: str
    file_extension: str = Field(alias="fileExtension")
    file_size_bytes: Optional[int] = Field(None, alias="fileSizeBytes")

    instrument: Optional[str] = None
    descriptors: list[str] = []
    tempo_bpm: Optional[float] = Field(None, alias="tempoBpm")
    key_signature: Optional[str] = Field(None, alias="keySignature")
    scale_type: Optional[str] = Field(None, alias="scaleType")
    full_key: Optional[str] = Field(None, alias="fullKey")
    genre: Optional[str] = None

    duration_seconds: Optional[float] = Field(None, alias="durationSeconds")
    sample_rate: Optional[int] = Field(None, alias="sampleRate")
    channels: Optional[int] = None
    bit_depth: Optional[int] = Field(None, alias="bitDepth")
    length_bars: Optional[float] = Field(None, alias="lengthBars")

    # Extended sample classification
    sample_type: str = Field("audio", alias="sampleType")
    is_loop: Optional[bool] = Field(None, alias="isLoop")
    is_processed: Optional[bool] = Field(None, alias="isProcessed")
    is_polyphonic: Optional[bool] = Field(None, alias="isPolyphonic")
    time_signature: Optional[str] = Field(None, alias="timeSignature")

    created_at: Optional[datetime] = Field(None, alias="createdAt")
    indexed_at: Optional[datetime] = Field(None, alias="indexedAt")

    class Config:
        populate_by_name = True
        from_attributes = True


class SampleListResponse(BaseModel):
    """Paginated list of samples."""

    items: list[SampleResponse]
    total: int
    page: int
    per_page: int = Field(alias="perPage")
    pages: int

    class Config:
        populate_by_name = True


class DirectoryInfo(BaseModel):
    """Directory with sample count."""

    path: str
    name: str
    sample_count: int = Field(alias="sampleCount")

    class Config:
        populate_by_name = True


class InstrumentInfo(BaseModel):
    """Instrument with sample count."""

    name: str
    sample_count: int = Field(alias="sampleCount")

    class Config:
        populate_by_name = True


class KeyInfo(BaseModel):
    """Key signature with sample count."""

    key_signature: str = Field(alias="keySignature")
    scale_type: str = Field(alias="scaleType")
    sample_count: int = Field(alias="sampleCount")

    class Config:
        populate_by_name = True


class GenreInfo(BaseModel):
    """Genre with sample count."""

    name: str
    sample_count: int = Field(alias="sampleCount")

    class Config:
        populate_by_name = True


class FileTypeInfo(BaseModel):
    """File type/extension with sample count."""

    extension: str
    sample_count: int = Field(alias="sampleCount")

    class Config:
        populate_by_name = True


class ScanStatusResponse(BaseModel):
    """Scan status response."""

    status: str
    progress_percent: Optional[float] = Field(None, alias="progressPercent")
    files_scanned: int = Field(0, alias="filesScanned")
    files_total: int = Field(0, alias="filesTotal")
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    error_message: Optional[str] = Field(None, alias="errorMessage")

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    database: str
    audio_path: str = Field(alias="audioPath")
    total_samples: int = Field(alias="totalSamples")

    class Config:
        populate_by_name = True
