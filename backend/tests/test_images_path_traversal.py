"""Regression tests for the directory-image path traversal fix.

`GET /api/samples/directory-image?directory=` used to join the caller's
`directory` query param onto the audio root with no containment check:
`Path(audio_root) / '/etc'` collapses to `/etc` (pathlib treats an absolute
right-hand operand as a full replacement, not a join), and `../../etc`
walked out the same way. Both `find_directory_image` and the containment
check itself (`_resolve_directory_within_root`) are exercised here, plus a
symlink escape (a directory or file inside the audio root that resolves
somewhere else on disk).

Run from backend/:  python -m pytest tests
"""
from types import SimpleNamespace

import pytest

from app.services import images


@pytest.fixture
def audio_root(tmp_path, monkeypatch):
    """Point the image service at an isolated audio root for this test."""
    root = tmp_path / "audio"
    root.mkdir()
    fake_settings = SimpleNamespace(audio_path=str(root))
    monkeypatch.setattr(images, "get_settings", lambda: fake_settings)
    images.clear_image_cache()
    yield root
    images.clear_image_cache()


def test_finds_cover_art_for_a_legitimate_directory(audio_root):
    pack_dir = audio_root / "pack"
    pack_dir.mkdir()
    (pack_dir / "cover.jpg").write_bytes(b"fake-image-bytes")

    result = images.find_directory_image("pack")

    assert result == str(pack_dir / "cover.jpg")


def test_rejects_absolute_path_escape(audio_root, tmp_path):
    # Simulates ?directory=/etc (or any absolute path). Also prove that the
    # underlying pathlib footgun is real: Path(root) / '/etc' really does
    # collapse to '/etc', which is exactly why a containment check is needed.
    assert images.Path(audio_root) / "/etc" == images.Path("/etc")

    outside = tmp_path / "etc"
    outside.mkdir()
    (outside / "passwd.png").write_bytes(b"not actually /etc, but outside the root")

    assert images.find_directory_image(str(outside)) is None


def test_rejects_dot_dot_parent_traversal(audio_root, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "secret.png").write_bytes(b"fake")

    assert images.find_directory_image("../outside") is None
    assert images.find_directory_image("pack/../../outside") is None


def test_rejects_symlinked_directory_that_escapes_root(audio_root, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "cover.png").write_bytes(b"fake")

    try:
        (audio_root / "linked").symlink_to(outside, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks not supported on this filesystem")

    assert images.find_directory_image("linked") is None


def test_rejects_symlinked_file_inside_a_legit_directory_that_escapes_root(audio_root, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "cover.png").write_bytes(b"fake")

    pack_dir = audio_root / "pack"
    pack_dir.mkdir()
    try:
        (pack_dir / "cover.png").symlink_to(outside / "cover.png")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks not supported on this filesystem")

    # The directory itself is legitimate, but its only image is a symlink
    # pointing outside the audio root — must not be served.
    assert images.find_directory_image("pack") is None


def test_nonexistent_directory_returns_none(audio_root):
    assert images.find_directory_image("does-not-exist") is None


def test_root_directory_shorthand(audio_root):
    (audio_root / "cover.png").write_bytes(b"fake")

    assert images.find_directory_image("") == str(audio_root / "cover.png")
    assert images.find_directory_image(".") == str(audio_root / "cover.png")
