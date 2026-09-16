# CLAUDE.md - Sample Browser

This is a self-hosted web application for browsing, organizing, and searching audio samples and loops.

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js + React + TypeScript | Next.js 15, React 19 |
| Backend | FastAPI (Python) | Python 3.11+ |
| Database | SQLite + FTS5 | Full-text search |
| Container | Docker Compose | Multi-container |

## Project Structure

```
sample-browser/
├── backend/                 # FastAPI Python backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI entry point
│       ├── config.py        # Environment settings
│       ├── database/
│       │   ├── connection.py
│       │   └── schema.py    # SQLite schema + FTS5
│       ├── models/
│       │   ├── sample.py    # Sample dataclass
│       │   └── search.py    # Request/response models
│       ├── services/
│       │   ├── scanner.py   # Directory scanner
│       │   ├── parser.py    # Filename metadata parser
│       │   ├── indexer.py   # Database indexer
│       │   └── images.py    # Cover art service
│       └── routers/
│           ├── samples.py   # Main API (CRUD, search, audio streaming)
│           └── health.py    # Health check
├── frontend/                # Next.js React frontend
│   ├── Dockerfile
│   ├── package.json
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── globals.css      # CSS variables theming
│       ├── components/
│       │   ├── SampleBrowser.tsx   # Main container
│       │   ├── SampleCard.tsx      # Grid/list item
│       │   ├── SampleTable.tsx     # Table view
│       │   ├── FilterPanel.tsx     # Sidebar filters
│       │   ├── AudioPlayer.tsx     # Playback controls
│       │   ├── Waveform.tsx        # Waveform visualization
│       │   ├── DirectoryTree.tsx   # Hierarchical browser
│       │   ├── MultiSelect.tsx     # Multi-select dropdown
│       │   ├── RangeSlider.tsx     # Dual-handle slider
│       │   └── SettingsModal.tsx   # Settings & backup
│       └── lib/
│           ├── types/              # TypeScript types
│           ├── api/client.ts       # API client
│           └── context/
│               ├── SettingsContext.tsx
│               ├── FavoritesContext.tsx
│               └── AudioContext.tsx
├── data/                    # Persistent data (gitignored)
│   ├── samples.db           # SQLite database
│   ├── midi_cache/          # Cached MIDI->WAV files
│   └── transcode_cache/     # Cached CAF/ALAC->WAV files
├── docker-compose.yml
├── .env.example
├── README.md
├── ROADMAP.md
├── SAMPLE_FIELDS.md         # Field definitions
└── CLAUDE.md                # This file
```

## Key Files

### Backend

- **app/routers/samples.py** - Main API with all endpoints, audio streaming, MIDI synthesis, and CAF transcoding
- **app/services/parser.py** - Filename metadata extraction (tempo, key, instrument)
- **app/services/scanner.py** - Directory scanning with mutagen/ffprobe for audio metadata
- **app/database/schema.py** - SQLite schema with FTS5 full-text search

### Frontend

- **components/SampleBrowser.tsx** - Main container with state management
- **components/FilterPanel.tsx** - All filter controls (multi-selects, range sliders, toggles)
- **components/SampleTable.tsx** - Detailed table view with sortable columns
- **lib/context/SettingsContext.tsx** - View settings, visible fields, theme
- **lib/context/FavoritesContext.tsx** - Favorites with localStorage persistence
- **lib/types/search.ts** - SearchFilters interface with all filter options

## Development Commands

### Docker (Production)

```bash
docker compose build
docker compose up -d
docker compose logs -f backend
docker compose logs -f frontend
```

### Backend (Local Development)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (Local Development)

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Required:
- `DATA_PATH` - Host path for database and cache (read-write)
- `AUDIO_PATH` - Host path for audio files (read-only)

Optional:
- `PUID`/`PGID` - Container user/group IDs (default: 568)
- `TZ` - Timezone (default: America/Chicago)
- `PUBLISHED_PORT` - Web port (default: 3000)
- `SCAN_ON_STARTUP` - Auto-scan on start (default: true)
- `LOG_LEVEL` - Logging level (default: info)

## Audio Format Support

| Format | Playback Method |
|--------|----------------|
| WAV, MP3, FLAC, OGG, AIFF, M4A | Native browser |
| CAF (AAC/ALAC) | ffmpeg transcoding to WAV (cached) |
| MIDI (.mid, .midi) | FluidSynth synthesis to WAV (cached) |

Cache files use MD5(filepath + mtime) as keys for automatic invalidation.

## Database Schema

Main table: `samples`
- File info: filepath, filename, directory, file_extension, file_size_bytes
- Parsed metadata: instrument, descriptors_json, tempo_bpm, key_signature, scale_type, genre
- Audio metadata: duration_seconds, sample_rate, channels, bit_depth, length_bars
- Classification: sample_type, is_loop, is_processed, is_polyphonic, time_signature
- Timestamps: file_modified_at, created_at, indexed_at

FTS5 virtual table: `samples_fts` (filename, directory, instrument, descriptors)

## API Patterns

### Multi-select Filters
Comma-separated values: `?instrument=Piano,Guitar&genre=Rock,Jazz`

### Favorites Filtering
Pass favorite IDs via query param: `?ids=1,5,23,42`

### Audio Streaming
- Native formats: Direct file streaming with proper MIME type
- CAF/ALAC: Transcode to WAV, cache, then stream
- MIDI: Synthesize with FluidSynth, cache, then stream

## Common Tasks

### Add a New Filter

1. Add field to `SearchFilters` in `frontend/app/lib/types/search.ts`
2. Add default value to `DEFAULT_FILTERS`
3. Add filter UI in `frontend/app/components/FilterPanel.tsx`
4. Add query parameter in `backend/app/routers/samples.py` list_samples()
5. Add SQL condition in the query builder

### Add a New Visible Field

1. Add to `VisibleField` type in `frontend/app/lib/context/SettingsContext.tsx`
2. Add to `ALL_VISIBLE_FIELDS` array
3. Add label to `FIELD_LABELS` object
4. Add to `DEFAULT_SETTINGS.visibleFields` if visible by default
5. Add display logic in `SampleCard.tsx` and/or `SampleTable.tsx`

### Add a New Sort Option

1. Add to sort_by Literal type in `backend/app/routers/samples.py`
2. Add to sortBy type in `frontend/app/lib/types/search.ts`
3. Add column mapping in `frontend/app/components/SampleTable.tsx`

## Gotchas

- This is a git subtree published as a **one-commit orphan snapshot**. Its public
  history shares no ancestry with anything this repo can split, so a subtree push
  can never fast-forward. Publish with:
  `scripts/publish-subtree-snapshot.sh --prefix=music/sample-browser --publish`
- **NEVER run `git subtree push` or `git subtree split`.** A raw split has twice
  pushed the entire mono-repo history — and the secrets in it — to a public remote
  (see `docs/security/2026-02-04-` and `2026-05-12-credential-leak-audit.md`). A
  pre-push hook now refuses it.

## Performance Notes

- Waveforms lazy-load on first play to avoid decode errors for unsupported formats
- MIDI and CAF files are cached after first transcoding (~4-5x faster repeat plays)
- FTS5 provides fast full-text search across filename, directory, instrument, descriptors
- Favorites state is optimized to only trigger refetch when favoritesOnly filter is active
