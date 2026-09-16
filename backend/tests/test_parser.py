"""Filename parsing: the README's example table, and the keyword detectors.

Run from backend/:  python -m pytest tests
"""
import pytest

from app.services.parser import parse_filename


# The "How filenames are read" table in the README. If one of these changes,
# the table is wrong too.
@pytest.mark.parametrize("path, instrument, key, scale, bpm, genre, descriptors, is_loop", [
    ("Funky_Bass_Cmaj_120bpm.wav", "Bass", "C", "major", 120.0, None, ["funky", "cmaj"], None),
    ("808_Kick_Hard.wav", "808", None, None, None, None, ["hard"], None),
    ("Piano_Chords_G_minor_85bpm.wav", "Piano", "G", "minor", 85.0, None, ["85bpm"], None),
    ("Neo Soul Keys Pack/Rhodes/Rhodes_Chords_Am_90bpm.wav", "Rhodes", "A", "minor", 90.0,
     "Neo Soul", ["neo", "am", "90bpm"], None),
    ("Drums/Loops/Drums_140bpm.wav", "Drums", None, None, 140.0, None, [], True),
])
def test_readme_examples(path, instrument, key, scale, bpm, genre, descriptors, is_loop):
    p = parse_filename(path)
    assert (p.instrument, p.key_signature, p.scale_type, p.tempo_bpm, p.genre) == (
        instrument, key, scale, bpm, genre)
    assert p.descriptors == descriptors
    assert p.is_loop is is_loop


# Keywords are words whether spaces, underscores, hyphens or folders separate
# them. Underscores used to hide them: \b counts "_" as part of a word.
@pytest.mark.parametrize("path, expected", [
    ("Pad Loop.wav", True),
    ("Pad_Loop.wav", True),
    ("Pad-Looping.wav", True),
    ("Drums/Loops/Drums_140bpm.wav", True),
    ("Kick_One_Shot.wav", False),
    ("Snare_Oneshot.wav", False),
    ("Brass_Stab_03.wav", False),
    ("Loopy_Lead.wav", None),
    ("Kick_Hard.wav", None),
])
def test_loop_detection(path, expected):
    assert parse_filename(path).is_loop is expected


@pytest.mark.parametrize("path, expected", [
    ("Kick 4_4.wav", "4/4"),
    ("Drums_4_4_140bpm.wav", "4/4"),
    ("Waltz_3_4_Loop.wav", "3/4"),
    ("Groove_12_8.wav", "12/8"),
    ("Bass_14_4.wav", None),
    ("Bass_140bpm.wav", None),
])
def test_time_signature(path, expected):
    assert parse_filename(path).time_signature == expected


@pytest.mark.parametrize("path, expected", [
    ("Vox_Wet.wav", True),
    ("Guitar_Reverb_Tail.wav", True),
    ("Hihat_Dry.wav", False),
    ("Drums/Raw/Kick.wav", False),
    ("Drywall_Hit.wav", None),
])
def test_processed_detection(path, expected):
    assert parse_filename(path).is_processed is expected
