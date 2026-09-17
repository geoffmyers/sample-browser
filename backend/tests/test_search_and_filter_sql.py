"""Regression tests for the /search FTS5 crash and the directory/descriptor
LIKE filters.

`/api/samples/search` used to pass `q` straight to `samples_fts MATCH`
without going through `sanitize_fts5_query` (which `/api/samples` already
used) — a stray quote in `q` raised `sqlite3.OperationalError: fts5: syntax
error`, a 500. The directory and descriptor `LIKE` filters didn't escape
`%`/`_`, so a directory literally named e.g. `100%` matched every directory.

These run the sanitized/escaped values against a real, in-memory SQLite
connection using the app's own schema, so a "sanitization" that still
produces invalid FTS5 syntax, or an escape that still lets `%`/`_` act as a
wildcard, would be caught — not just a transformation of the string.

Run from backend/:  python -m pytest tests
"""
import sqlite3

import pytest

from app.database.schema import FTS_SCHEMA_SQL, SCHEMA_SQL
from app.routers.samples import escape_like, sanitize_fts5_query


def _insert_sample(conn, directory, filename):
    conn.execute(
        """
        INSERT INTO samples (filepath, filename, directory, file_extension)
        VALUES (?, ?, ?, ?)
        """,
        (f"/audio/{directory}/{filename}", filename, directory, ".wav"),
    )


@pytest.fixture
def conn():
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA_SQL)
    connection.executescript(FTS_SCHEMA_SQL)
    _insert_sample(connection, "100%", "kick_1.wav")
    _insert_sample(connection, "100x", "kick_2.wav")
    connection.commit()
    return connection


# --- /search: a stray quote (or other FTS5 syntax) must not raise ---------

@pytest.mark.parametrize("query", [
    'kick"',
    '"',
    'kick" OR "1"="1',
    "**((",
    "kick AND OR NOT",
    "()",
])
def test_sanitize_fts5_query_never_raises_a_syntax_error(conn, query):
    sanitized = sanitize_fts5_query(query)
    if not sanitized:
        return
    # This is the exact call /search makes; it used to be `q` unsanitized.
    conn.execute(
        "SELECT rowid FROM samples_fts WHERE samples_fts MATCH ? ORDER BY rank",
        (sanitized,),
    ).fetchall()


def test_sanitize_fts5_query_finds_a_real_match(conn):
    sanitized = sanitize_fts5_query("kick")
    rows = conn.execute(
        "SELECT rowid FROM samples_fts WHERE samples_fts MATCH ?", (sanitized,)
    ).fetchall()
    assert len(rows) == 2


def test_sanitize_fts5_query_empty_input():
    assert sanitize_fts5_query("") == ""
    assert sanitize_fts5_query(None) == ""


# --- directory/descriptor LIKE filters: % and _ must be literal ------------

def test_escape_like_percent_is_not_a_wildcard(conn):
    # Without escaping, a directory literally named "100%" (as a LIKE
    # pattern "100%%") matches "100x" too, since the first % is literal
    # text but the trailing wildcard still matches anything.
    pattern = f"{escape_like('100%')}%"
    rows = conn.execute(
        "SELECT directory FROM samples WHERE directory LIKE ? ESCAPE '\\'",
        (pattern,),
    ).fetchall()
    assert [r["directory"] for r in rows] == ["100%"]


def test_escape_like_underscore_is_not_a_single_char_wildcard(conn):
    _insert_sample(conn, "a_b", "kick_3.wav")
    _insert_sample(conn, "aXb", "kick_4.wav")
    conn.commit()

    pattern = f"{escape_like('a_b')}%"
    rows = conn.execute(
        "SELECT directory FROM samples WHERE directory LIKE ? ESCAPE '\\'",
        (pattern,),
    ).fetchall()
    assert [r["directory"] for r in rows] == ["a_b"]


def test_escape_like_is_idempotent_for_plain_text(conn):
    pattern = f"{escape_like('100x')}%"
    rows = conn.execute(
        "SELECT directory FROM samples WHERE directory LIKE ? ESCAPE '\\'",
        (pattern,),
    ).fetchall()
    assert [r["directory"] for r in rows] == ["100x"]
