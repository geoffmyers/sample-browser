"""End-to-end integration test: upload -> scan -> search.

Exercises the real FastAPI app (`app.main.app`) through `TestClient`, against
an isolated audio directory and SQLite database, so this proves the whole
chain works together, not just each function in isolation:

1. `POST /api/samples/upload` saves a real (small, silent) WAV under
   AUDIO_PATH and schedules a background scan.
2. That scan (run synchronously by TestClient before the response returns)
   indexes it into the database via the same `Indexer` the `/scan` endpoint
   uses.
3. `GET /api/samples/search` (the endpoint this session added
   `sanitize_fts5_query` to) finds it by filename.
4. `GET /api/samples` (list + directory LIKE filter) finds it too.

Run from backend/:  python -m pytest tests
"""
import io
import wave

import pytest


def _make_wav_bytes(duration_seconds: float = 0.25, sample_rate: int = 8000) -> bytes:
    """A minimal, valid, silent WAV file — enough for `filetype.guess()` to
    recognize as audio and for `mutagen` to read duration/sample_rate from."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(b"\x00\x00" * int(duration_seconds * sample_rate))
    return buf.getvalue()


@pytest.fixture
def client(tmp_path, monkeypatch):
    """A TestClient wired to an isolated AUDIO_PATH/DATABASE_PATH, with every
    relevant lru_cache and global connection reset first so this test's
    settings take effect regardless of what any earlier test module did."""
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    db_path = tmp_path / "data" / "samples.db"

    monkeypatch.setenv("AUDIO_PATH", str(audio_dir))
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    monkeypatch.setenv("SCAN_ON_STARTUP", "false")
    monkeypatch.setenv("WATCH_FOR_CHANGES", "false")

    import app.config as config_module

    config_module.get_settings.cache_clear()

    import app.database.connection as db_module

    db_module.close_db()

    import app.services.images as images_module

    images_module.clear_image_cache()

    from fastapi.testclient import TestClient

    from app.main import app as fastapi_app

    with TestClient(fastapi_app) as test_client:
        yield test_client

    db_module.close_db()
    config_module.get_settings.cache_clear()


def test_upload_then_scan_then_search(client):
    wav_bytes = _make_wav_bytes()

    # 1. Upload
    response = client.post(
        "/api/samples/upload",
        params={"directory": "integration-test"},
        files={"files": ("Kick_Hard_140bpm.wav", wav_bytes, "audio/wav")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["uploaded"] == 1
    assert body["errors"] == 0

    # 2. Scan already ran as a background task before the response above
    # returned (TestClient runs BackgroundTasks synchronously). Confirm it
    # actually completed rather than assuming it.
    status_response = client.get("/api/samples/scan/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "complete"

    # 3. Search finds it (this is the endpoint that now sanitizes `q`)
    search_response = client.get("/api/samples/search", params={"q": "Kick"})
    assert search_response.status_code == 200
    results = search_response.json()
    assert len(results) == 1
    assert results[0]["filename"] == "Kick_Hard_140bpm.wav"
    assert results[0]["directory"] == "integration-test"

    # A stray quote must not 500 the endpoint it used to.
    quote_response = client.get("/api/samples/search", params={"q": 'Kick"'})
    assert quote_response.status_code == 200

    # 4. List + directory filter (the LIKE filter this session escaped)
    list_response = client.get(
        "/api/samples", params={"directory": "integration-test"}
    )
    assert list_response.status_code == 200
    list_body = list_response.json()
    assert list_body["total"] == 1
    assert list_body["items"][0]["filename"] == "Kick_Hard_140bpm.wav"
