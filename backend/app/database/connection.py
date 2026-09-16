"""Database connection management."""

import sqlite3
import logging
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

from .schema import SCHEMA_SQL, FTS_SCHEMA_SQL
from ..config import get_settings

logger = logging.getLogger(__name__)

# Global connection for the application
_connection: sqlite3.Connection | None = None


def get_connection() -> sqlite3.Connection:
    """Get or create the database connection."""
    global _connection
    if _connection is None:
        _connection = _create_connection()
    return _connection


def _create_connection() -> sqlite3.Connection:
    """Create a new database connection."""
    settings = get_settings()
    db_path = Path(settings.database_path)

    # Ensure directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info(f"Connecting to database: {db_path}")

    conn = sqlite3.connect(
        str(db_path),
        check_same_thread=False,
        timeout=30.0,
    )
    conn.row_factory = sqlite3.Row

    # Enable foreign keys and WAL mode for better concurrency
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = -64000")  # 64MB cache

    return conn


def _run_migrations(conn: sqlite3.Connection) -> None:
    """Run database migrations to add missing columns and indexes."""
    # Get existing columns
    cursor = conn.execute("PRAGMA table_info(samples)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    # Define columns that may need to be added (column_name, sql_type, default_value)
    column_migrations = [
        ("length_bars", "REAL", None),
        ("bit_depth", "INTEGER", None),
        ("genre", "TEXT", None),
        ("duration_seconds", "REAL", None),
        # Extended sample classification fields
        ("sample_type", "TEXT", "'audio'"),
        ("is_loop", "INTEGER", None),
        ("is_processed", "INTEGER", None),
        ("is_polyphonic", "INTEGER", None),
        ("time_signature", "TEXT", None),
    ]

    columns_added = []
    for column_name, column_type, default_value in column_migrations:
        if column_name not in existing_columns:
            logger.info(f"Adding missing column: {column_name}")
            if default_value:
                conn.execute(
                    f"ALTER TABLE samples ADD COLUMN {column_name} {column_type} DEFAULT {default_value}"
                )
            else:
                conn.execute(f"ALTER TABLE samples ADD COLUMN {column_name} {column_type}")
            conn.commit()
            columns_added.append(column_name)

    # Create indexes for migrated columns (these need to be created after the column exists)
    index_migrations = [
        ("idx_samples_genre", "genre"),
        ("idx_samples_duration_seconds", "duration_seconds"),
        ("idx_samples_length_bars", "length_bars"),
        ("idx_samples_sample_type", "sample_type"),
        ("idx_samples_is_loop", "is_loop"),
        ("idx_samples_is_processed", "is_processed"),
        ("idx_samples_time_signature", "time_signature"),
    ]

    for index_name, column_name in index_migrations:
        try:
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS {index_name} ON samples({column_name})"
            )
            conn.commit()
        except sqlite3.OperationalError as e:
            logger.warning(f"Could not create index {index_name}: {e}")

    # Calculate length_bars for any samples that have tempo and duration but no bars
    # This runs on every startup to catch any samples that were indexed before this feature
    null_bars_count = conn.execute(
        """
        SELECT COUNT(*) FROM samples
        WHERE tempo_bpm IS NOT NULL
          AND duration_seconds IS NOT NULL
          AND length_bars IS NULL
        """
    ).fetchone()[0]

    if null_bars_count > 0:
        logger.info(f"Calculating length_bars for {null_bars_count} samples...")
        # Formula: bars = (tempo_bpm / 60) * duration_seconds / 4  (assuming 4/4 time)
        conn.execute(
            """
            UPDATE samples
            SET length_bars = ROUND((tempo_bpm / 60.0) * duration_seconds / 4.0, 2)
            WHERE tempo_bpm IS NOT NULL
              AND duration_seconds IS NOT NULL
              AND length_bars IS NULL
            """
        )
        conn.commit()
        logger.info(f"Calculated length_bars for {null_bars_count} samples")


def init_db() -> None:
    """Initialize the database schema."""
    conn = get_connection()
    logger.info("Initializing database schema")

    # Create main tables
    conn.executescript(SCHEMA_SQL)
    conn.commit()

    # Run migrations for any missing columns
    _run_migrations(conn)

    # Create FTS tables (separate to handle errors gracefully)
    try:
        conn.executescript(FTS_SCHEMA_SQL)
        conn.commit()
        logger.info("FTS5 tables created successfully")
    except sqlite3.OperationalError as e:
        logger.warning(f"FTS5 setup failed (may already exist): {e}")

    logger.info("Database initialization complete")


def close_db() -> None:
    """Close the database connection."""
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None
        logger.info("Database connection closed")


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database access."""
    conn = get_connection()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
