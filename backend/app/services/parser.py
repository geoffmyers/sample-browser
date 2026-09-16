"""
Filename parser for extracting metadata from audio sample filenames.

Common filename patterns:
- Funky_Bass_Cmaj_120bpm.wav
- 808_Kick_Hard.wav
- Piano_Chords_G_minor_85bpm.wav
- Lead_Synth_F#m_140.wav
- Strings_Pad_Db_Major_70bpm.aif
- Drums_Breakbeat_95.wav
"""

import re
from pathlib import Path
from typing import Optional, Tuple

from ..models.sample import ParsedFilename


# Known instrument categories
INSTRUMENTS = {
    # Drums/Percussion
    "drums",
    "drum",
    "kick",
    "snare",
    "hihat",
    "hi-hat",
    "hat",
    "cymbal",
    "tom",
    "perc",
    "percussion",
    "clap",
    "808",
    "909",
    "breakbeat",
    "beat",
    "groove",
    "shaker",
    "tambourine",
    "conga",
    "bongo",
    "rimshot",
    "crash",
    "ride",
    # Bass
    "bass",
    "sub",
    "reese",
    "wobble",
    # Keys/Synths
    "piano",
    "keys",
    "rhodes",
    "wurlitzer",
    "wurli",
    "organ",
    "synth",
    "pad",
    "lead",
    "pluck",
    "arp",
    "chord",
    "chords",
    "stab",
    "saw",
    "square",
    # Strings
    "strings",
    "violin",
    "cello",
    "viola",
    "orchestra",
    "orchestral",
    "ensemble",
    # Brass/Winds
    "brass",
    "trumpet",
    "horn",
    "sax",
    "saxophone",
    "flute",
    "clarinet",
    "trombone",
    # Guitar
    "guitar",
    "gtr",
    "acoustic",
    "electric",
    "strum",
    "riff",
    # Vocals
    "vocal",
    "vox",
    "voice",
    "acapella",
    "choir",
    "spoken",
    # FX
    "fx",
    "sfx",
    "riser",
    "impact",
    "sweep",
    "noise",
    "atmosphere",
    "atmos",
    "ambient",
    "texture",
    "foley",
    "whoosh",
    "hit",
    # Other
    "loop",
    "one-shot",
    "oneshot",
    "sample",
    "stem",
    "fill",
    "transition",
    "melody",
    "hook",
}

# Known genres (lowercase -> display name)
GENRES = {
    # Electronic
    "house": "House",
    "deep house": "Deep House",
    "tech house": "Tech House",
    "progressive house": "Progressive House",
    "techno": "Techno",
    "trance": "Trance",
    "dubstep": "Dubstep",
    "drum and bass": "Drum and Bass",
    "dnb": "Drum and Bass",
    "d&b": "Drum and Bass",
    "edm": "EDM",
    "electro": "Electro",
    "electronica": "Electronica",
    "ambient": "Ambient",
    "chillout": "Chillout",
    "downtempo": "Downtempo",
    "lofi": "Lo-Fi",
    "lo-fi": "Lo-Fi",
    "synthwave": "Synthwave",
    "retrowave": "Synthwave",
    "future bass": "Future Bass",
    "trap": "Trap",
    "uk garage": "UK Garage",
    "garage": "Garage",
    "breakbeat": "Breakbeat",
    "breaks": "Breakbeat",
    "jungle": "Jungle",
    "hardstyle": "Hardstyle",
    "hardcore": "Hardcore",
    "industrial": "Industrial",
    "idm": "IDM",
    # Hip Hop / R&B
    "hip hop": "Hip Hop",
    "hip-hop": "Hip Hop",
    "hiphop": "Hip Hop",
    "rap": "Hip Hop",
    "rnb": "R&B",
    "r&b": "R&B",
    "soul": "Soul",
    "neo soul": "Neo Soul",
    "funk": "Funk",
    "g-funk": "G-Funk",
    "boom bap": "Boom Bap",
    # Rock / Pop
    "rock": "Rock",
    "indie": "Indie",
    "alternative": "Alternative",
    "pop": "Pop",
    "punk": "Punk",
    "metal": "Metal",
    "grunge": "Grunge",
    # Jazz / Blues
    "jazz": "Jazz",
    "blues": "Blues",
    "swing": "Swing",
    "bebop": "Bebop",
    "fusion": "Fusion",
    # World / Folk
    "world": "World",
    "latin": "Latin",
    "reggae": "Reggae",
    "dub": "Dub",
    "afrobeat": "Afrobeat",
    "folk": "Folk",
    "country": "Country",
    "acoustic": "Acoustic",
    # Cinematic
    "cinematic": "Cinematic",
    "orchestral": "Orchestral",
    "epic": "Epic",
    "trailer": "Trailer",
    "soundtrack": "Soundtrack",
    "score": "Score",
    # Other
    "disco": "Disco",
    "nu disco": "Nu Disco",
    "80s": "80s",
    "90s": "90s",
    "retro": "Retro",
    "vintage": "Vintage",
    "experimental": "Experimental",
}

# Note patterns
NOTE_PATTERN = r"[A-Ga-g][#b]?"

# Key quality patterns
MAJOR_PATTERNS = [r"maj(?:or)?", r"M(?![a-z])"]
MINOR_PATTERNS = [r"min(?:or)?", r"m(?![a-z])"]


def parse_filename(filepath: str) -> ParsedFilename:
    """
    Parse metadata from an audio filename.

    Args:
        filepath: Full path or filename of the audio file

    Returns:
        ParsedFilename with extracted metadata
    """
    path = Path(filepath)
    filename = path.stem  # Remove extension

    result = ParsedFilename(original_filename=path.name)

    # Normalize separators and remove parentheses content
    # First, remove content in parentheses (often just file numbering)
    cleaned = re.sub(r"\([^)]*\)", "", filename)
    # Normalize separators
    normalized = cleaned.replace("-", "_").replace(" ", "_")
    # Remove any remaining parentheses, brackets
    normalized = re.sub(r"[(){}\[\]]", "_", normalized)
    tokens = [t.lower() for t in normalized.split("_") if t]

    # Extract instrument
    result.instrument = _extract_instrument(tokens)

    # Extract BPM
    result.tempo_bpm = _parse_bpm(filename)

    # Extract key signature
    key, scale = _parse_key(filename)
    result.key_signature = key
    result.scale_type = scale

    # Extract descriptors from filename
    result.descriptors = _extract_descriptors(tokens, result)

    # Add parent directory names as additional descriptors
    dir_descriptors = _extract_directory_descriptors(filepath)
    result.descriptors = dir_descriptors + result.descriptors

    # Extract genre from full filepath
    result.genre = _extract_genre(filepath)

    # Extract extended classification
    result.is_loop = _detect_loop(filepath)
    result.is_processed = _detect_processed(filepath)
    result.time_signature = _detect_time_signature(filepath)

    return result


def _extract_directory_descriptors(filepath: str) -> list[str]:
    """
    Extract meaningful descriptors from parent directory names.

    Splits each directory name into tokens and filters out common non-descriptive words.
    """
    path = Path(filepath)

    # Words to exclude from directory descriptors
    excluded_words = {
        # Common generic folder names
        "samples", "sample", "loops", "loop", "audio", "sounds", "sound",
        "music", "library", "libraries", "pack", "packs", "kit", "kits",
        "collection", "collections", "vol", "volume", "v1", "v2", "v3",
        "pt1", "pt2", "part1", "part2", "wav", "aiff", "mp3", "flac",
        # Common non-descriptive words
        "the", "and", "or", "of", "a", "an", "to", "for", "by", "with",
        "from", "in", "on", "at", "is", "it", "as", "be", "this", "that",
        # Already captured elsewhere
        "bpm", "key", "maj", "min", "major", "minor",
    }

    # Also exclude known instruments and genres (they're captured separately)
    excluded_words.update(w.lower() for w in INSTRUMENTS)
    excluded_words.update(w.lower() for w in GENRES.keys())

    descriptors = []
    seen = set()

    # Walk up the directory tree (skip the filename itself)
    for parent in path.parents:
        dir_name = parent.name
        if not dir_name:
            continue

        # Normalize and split directory name into tokens
        normalized = dir_name.lower().replace("-", "_").replace(" ", "_")
        normalized = re.sub(r"[(){}\[\]]", "_", normalized)
        tokens = [t for t in normalized.split("_") if t]

        for token in tokens:
            # Skip excluded words
            if token in excluded_words:
                continue

            # Skip very short tokens
            if len(token) <= 2:
                continue

            # Skip purely numeric tokens
            if token.isdigit():
                continue

            # Skip tokens that are mostly numeric
            letters = sum(1 for c in token if c.isalpha())
            digits = sum(1 for c in token if c.isdigit())
            if digits > 0 and letters <= digits:
                continue

            # Avoid duplicates
            if token in seen:
                continue

            seen.add(token)
            descriptors.append(token)

    return descriptors


def _extract_instrument(tokens: list[str]) -> Optional[str]:
    """Extract instrument from tokens."""
    for token in tokens:
        if token in INSTRUMENTS:
            # Capitalize nicely
            if token == "808" or token == "909":
                return token
            return token.capitalize()

    return None


def _parse_bpm(s: str) -> Optional[float]:
    """Extract BPM from string."""
    # Explicit BPM pattern (most reliable)
    explicit = re.search(r"(?:^|[^0-9])(\d{2,3})[\s_-]*bpm(?:[^a-z]|$)", s, re.I)
    if explicit:
        bpm = float(explicit.group(1))
        if 40 <= bpm <= 300:
            return bpm

    # Standalone number in tempo range
    standalone = re.search(r"(?:^|[_\s-])(\d{2,3})(?:[_\s-]|$)", s)
    if standalone:
        bpm = float(standalone.group(1))
        # More restrictive range for numbers without "bpm" suffix
        if 60 <= bpm <= 200:
            # Avoid common non-BPM numbers
            if bpm not in (100,):
                return bpm

    return None


def _parse_key(s: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract key signature and scale type."""
    # Pattern: note + quality word
    explicit = re.search(
        rf"(?:^|[^A-Za-z])({NOTE_PATTERN})[\s_-]*(major|minor|maj|min)(?:[^a-z]|$)",
        s,
        re.IGNORECASE,
    )
    if explicit:
        root = _normalize_note(explicit.group(1))
        quality = explicit.group(2).lower()
        scale = "major" if quality in ("major", "maj") else "minor"
        return root, scale

    # Pattern: note + suffix (Cmaj, Am, F#m)
    suffix = re.search(
        rf"(?:^|[^A-Za-z])({NOTE_PATTERN})(maj|min|m)(?:[^a-z]|$)",
        s,
        re.IGNORECASE,
    )
    if suffix:
        root = _normalize_note(suffix.group(1))
        quality = suffix.group(2).lower()
        scale = "major" if quality == "maj" else "minor"
        return root, scale

    # Standalone note (assume major)
    standalone = re.search(rf"(?:^|[_\s-])({NOTE_PATTERN})(?:[_\s-]|$)", s)
    if standalone:
        root = _normalize_note(standalone.group(1))
        if root in ("A", "B", "C", "D", "E", "F", "G") or len(root) == 2:
            return root, "major"

    return None, None


def _normalize_note(note: str) -> str:
    """Normalize note to uppercase with lowercase accidental."""
    if len(note) == 1:
        return note.upper()
    return note[0].upper() + note[1].lower()


def _extract_descriptors(tokens: list[str], parsed: ParsedFilename) -> list[str]:
    """Extract descriptor words from tokens."""
    # Build set of tokens to exclude
    excluded = set()

    if parsed.instrument:
        excluded.add(parsed.instrument.lower())

    if parsed.tempo_bpm:
        excluded.add(str(int(parsed.tempo_bpm)))

    excluded.add("bpm")

    if parsed.key_signature:
        excluded.add(parsed.key_signature.lower())

    if parsed.scale_type:
        excluded.add(parsed.scale_type)

    excluded.update(["maj", "min", "major", "minor"])

    # Also exclude instrument tokens
    excluded.update(INSTRUMENTS)

    # Filter out excluded tokens and non-meaningful tokens
    descriptors = []
    for t in tokens:
        # Skip tokens in excluded set
        if t in excluded:
            continue

        # Skip very short tokens (1 character)
        if len(t) <= 1:
            continue

        # Skip purely numeric tokens (including leading zeros like "00001")
        if t.isdigit():
            continue

        # Skip tokens that are mostly numeric (e.g., "00001", "123abc")
        # A meaningful descriptor should have more letters than digits
        letters = sum(1 for c in t if c.isalpha())
        digits = sum(1 for c in t if c.isdigit())
        if digits > 0 and letters <= digits:
            continue

        # Skip tokens containing parentheses or other artifacts
        if any(c in t for c in "()[]{}"):
            continue

        # Skip single letter followed by closing paren artifact (e.g., "s)")
        if len(t) == 2 and t[1] == ')':
            continue

        # Skip common non-descriptor patterns
        # - Tokens that look like file numbering (digits with letters)
        if re.match(r"^\d+[a-z]?$", t):
            continue

        # Skip tokens that are just a letter and 's' (e.g., "s" from "(00001_s)")
        if t == "s":
            continue

        descriptors.append(t)

    return descriptors


def _extract_genre(filepath: str) -> Optional[str]:
    """
    Extract genre from filepath and filename.

    Searches for known genre keywords in the full path.
    Longer/more specific genres are matched first (e.g., "deep house" before "house").
    """
    # Normalize the filepath for matching
    path_lower = filepath.lower()
    # Replace common separators with spaces for multi-word genre matching
    path_normalized = path_lower.replace("_", " ").replace("-", " ").replace("/", " ").replace("\\", " ")

    # Sort genres by length (descending) to match longer/more specific genres first
    sorted_genres = sorted(GENRES.keys(), key=len, reverse=True)

    for genre_key in sorted_genres:
        # Check for genre as a complete word (surrounded by spaces or at boundaries)
        # This prevents matching "house" in "powerhouse"
        pattern = rf"(?:^|[^a-z])({re.escape(genre_key)})(?:[^a-z]|$)"
        if re.search(pattern, path_normalized):
            return GENRES[genre_key]

    return None


def _word(pattern: str) -> str:
    """Match `pattern` as a whole word of a lower-cased path.

    Not with \\b: regex treats "_" as part of a word, and sample names join words
    with underscores, so \\bloop\\b never matched "pad_loop.wav" and
    \\b4_4\\b never matched "drums_4_4_140bpm.wav". Any character that is not a
    letter or digit separates words here.
    """
    return rf"(?<![a-z0-9]){pattern}(?![a-z0-9])"


def _detect_loop(filepath: str) -> Optional[bool]:
    """
    Detect if sample is a loop or one-shot based on filename/path keywords.
    Returns True for loops, False for one-shots, None if unknown.
    """
    path_lower = filepath.lower()

    # Loop indicators
    loop_patterns = [
        _word(r"loop"),
        _word(r"loops"),
        _word(r"looping"),
        _word(r"cycl(?:e|ing)"),
    ]

    # One-shot indicators
    oneshot_patterns = [
        _word(r"one[_-]?shot"),
        _word(r"oneshot"),
        _word(r"single"),
        _word(r"hit"),
        _word(r"stab"),
        _word(r"shot"),
    ]

    for pattern in loop_patterns:
        if re.search(pattern, path_lower):
            return True

    for pattern in oneshot_patterns:
        if re.search(pattern, path_lower):
            return False

    return None


def _detect_processed(filepath: str) -> Optional[bool]:
    """
    Detect if sample is processed/wet or dry based on filename/path keywords.
    Returns True for processed, False for dry, None if unknown.
    """
    path_lower = filepath.lower()

    # Processed/wet indicators
    processed_patterns = [
        _word(r"wet"),
        _word(r"processed"),
        _word(r"fx"),
        _word(r"effect(?:s|ed)?"),
        _word(r"reverb"),
        _word(r"delay"),
        _word(r"distort(?:ion|ed)?"),
        _word(r"saturated?"),
        _word(r"compressed?"),
    ]

    # Dry indicators
    dry_patterns = [
        _word(r"dry"),
        _word(r"clean"),
        _word(r"raw"),
        _word(r"unprocessed"),
    ]

    for pattern in processed_patterns:
        if re.search(pattern, path_lower):
            return True

    for pattern in dry_patterns:
        if re.search(pattern, path_lower):
            return False

    return None


def _detect_time_signature(filepath: str) -> Optional[str]:
    """
    Detect time signature from filename/path.
    Returns time signature string like '4/4', '3/4', '6/8', or None if unknown.
    """
    path_lower = filepath.lower()

    # Common time signature patterns
    time_sig_patterns = [
        (_word(r"4[/_]4"), "4/4"),
        (_word(r"3[/_]4"), "3/4"),
        (_word(r"6[/_]8"), "6/8"),
        (_word(r"12[/_]8"), "12/8"),
        (_word(r"2[/_]4"), "2/4"),
        (_word(r"5[/_]4"), "5/4"),
        (_word(r"7[/_]8"), "7/8"),
    ]

    for pattern, time_sig in time_sig_patterns:
        if re.search(pattern, path_lower):
            return time_sig

    return None
