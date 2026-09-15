"""Database schema definitions."""

SCHEMA_SQL = """
-- Main samples table
CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- File information
    filepath TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    directory TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size_bytes INTEGER,

    -- Parsed metadata from filename
    instrument TEXT,
    descriptors_json TEXT,
    tempo_bpm REAL,
    key_signature TEXT,
    scale_type TEXT,
    genre TEXT,

    -- Audio file metadata
    duration_seconds REAL,
    sample_rate INTEGER,
    channels INTEGER,
    bit_depth INTEGER,
    length_bars REAL,

    -- Extended sample classification
    sample_type TEXT DEFAULT 'audio',  -- 'audio' or 'midi'
    is_loop INTEGER,                   -- 0=one-shot, 1=loop
    is_processed INTEGER,              -- 0=dry, 1=processed
    is_polyphonic INTEGER,             -- 0=mono, 1=polyphonic
    time_signature TEXT,               -- e.g., '4/4', '3/4', '6/8'

    -- Timestamps
    file_modified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexing status
    parse_status TEXT DEFAULT 'parsed',
    parse_error TEXT
);

-- Indexes for common queries (core columns that exist in all versions)
CREATE INDEX IF NOT EXISTS idx_samples_filepath ON samples(filepath);
CREATE INDEX IF NOT EXISTS idx_samples_filename ON samples(filename);
CREATE INDEX IF NOT EXISTS idx_samples_directory ON samples(directory);
CREATE INDEX IF NOT EXISTS idx_samples_instrument ON samples(instrument);
CREATE INDEX IF NOT EXISTS idx_samples_tempo_bpm ON samples(tempo_bpm);
CREATE INDEX IF NOT EXISTS idx_samples_key_signature ON samples(key_signature);
CREATE INDEX IF NOT EXISTS idx_samples_scale_type ON samples(scale_type);
CREATE INDEX IF NOT EXISTS idx_samples_parse_status ON samples(parse_status);

-- Compound indexes for common filter combinations (P1 Performance)
CREATE INDEX IF NOT EXISTS idx_samples_directory_sample_type ON samples(directory, sample_type);
CREATE INDEX IF NOT EXISTS idx_samples_tempo_duration ON samples(tempo_bpm, duration_seconds);
CREATE INDEX IF NOT EXISTS idx_samples_loop_type_genre ON samples(is_loop, sample_type, genre);
CREATE INDEX IF NOT EXISTS idx_samples_instrument_genre_key ON samples(instrument, genre, key_signature);
CREATE INDEX IF NOT EXISTS idx_samples_genre ON samples(genre);
CREATE INDEX IF NOT EXISTS idx_samples_file_extension ON samples(file_extension);
CREATE INDEX IF NOT EXISTS idx_samples_duration ON samples(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_samples_file_size ON samples(file_size_bytes);
CREATE INDEX IF NOT EXISTS idx_samples_is_loop ON samples(is_loop);
CREATE INDEX IF NOT EXISTS idx_samples_sample_type ON samples(sample_type);

-- Statistics table
CREATE TABLE IF NOT EXISTS index_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_samples INTEGER DEFAULT 0,
    total_directories INTEGER DEFAULT 0,
    last_scan_at TIMESTAMP,
    last_scan_duration_seconds REAL,
    scan_status TEXT DEFAULT 'idle',
    scan_progress_percent REAL DEFAULT 0,
    scan_files_scanned INTEGER DEFAULT 0,
    scan_files_total INTEGER DEFAULT 0,
    scan_error TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize stats row
INSERT OR IGNORE INTO index_stats (id) VALUES (1);
"""

FTS_SCHEMA_SQL = """
-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS samples_fts USING fts5(
    filename,
    directory,
    instrument,
    descriptors,
    content='samples',
    content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS samples_ai AFTER INSERT ON samples BEGIN
    INSERT INTO samples_fts(rowid, filename, directory, instrument, descriptors)
    VALUES (
        new.id,
        new.filename,
        new.directory,
        COALESCE(new.instrument, ''),
        COALESCE(new.descriptors_json, '')
    );
END;

CREATE TRIGGER IF NOT EXISTS samples_ad AFTER DELETE ON samples BEGIN
    INSERT INTO samples_fts(samples_fts, rowid, filename, directory, instrument, descriptors)
    VALUES (
        'delete',
        old.id,
        old.filename,
        old.directory,
        COALESCE(old.instrument, ''),
        COALESCE(old.descriptors_json, '')
    );
END;

CREATE TRIGGER IF NOT EXISTS samples_au AFTER UPDATE ON samples BEGIN
    INSERT INTO samples_fts(samples_fts, rowid, filename, directory, instrument, descriptors)
    VALUES (
        'delete',
        old.id,
        old.filename,
        old.directory,
        COALESCE(old.instrument, ''),
        COALESCE(old.descriptors_json, '')
    );
    INSERT INTO samples_fts(rowid, filename, directory, instrument, descriptors)
    VALUES (
        new.id,
        new.filename,
        new.directory,
        COALESCE(new.instrument, ''),
        COALESCE(new.descriptors_json, '')
    );
END;
"""
