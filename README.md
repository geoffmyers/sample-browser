---
title: Sample Browser
created: 2026-01-28
modified: 2026-01-28
description: "A self-hosted web application for browsing, organizing, and searching audio samples and loops."
tags: [music, readme]
---

# Sample Browser

A self-hosted web application for browsing, organizing, and searching audio samples and loops.

## Features

### Browsing & Display
- **Multiple view modes**: Grid, list, and detailed table views
- **Sortable columns**: Click column headers to sort by any field (ascending/descending)
- **Customizable fields**: Toggle which metadata fields appear in each view
- **Directory cover art**: Displays album/folder artwork when available
- **Waveform visualization**: Visual waveforms for audio preview
- **Dark/light themes**: Toggle between color themes
- **Responsive design**: Optimized for desktop and mobile

### Search & Filtering
- **Full-text search**: Search by filename, directory, instrument, or descriptors
- **Multi-select filters**: Filter by multiple instruments, genres, or keys simultaneously
- **Range sliders**: Filter by tempo (BPM), duration, length (bars), sample rate, file size
- **Hierarchical directory browser**: Expandable tree view for directory navigation
- **Advanced filters**: Filter by channels (mono/stereo), bit depth, loop/one-shot, processed/dry, polyphonic/monophonic, time signature, date added, file type

### Audio Playback
- **In-browser playback**: Play samples directly with HTML5 audio
- **Single-sample playback**: Automatically stops other playing samples
- **Loop toggle**: Enable/disable loop playback for all samples
- **Volume control**: Adjustable playback volume
- **MIDI synthesis**: Real-time FluidSynth rendering for MIDI file playback
- **CAF/ALAC transcoding**: Server-side ffmpeg conversion for Apple audio formats

### Performance Optimizations
- **MIDI synthesis caching**: Cached WAV files for fast repeat MIDI playback
- **CAF/ALAC transcoding cache**: Cached transcoded files for Apple formats
- **Lazy waveform loading**: Waveforms load only when playback starts

### Organization
- **Favorites system**: Star samples for quick access with localStorage persistence
- **Backup/restore**: Export and import favorites and settings as JSON
- **File upload**: Upload new samples directly through the web interface

### Metadata
- **Automatic parsing**: Extracts metadata from filenames (tempo, key, instrument, etc.)
- **Parent directory tags**: Adds parent folder names as searchable descriptors
- **Audio analysis**: Extracts sample rate, bit depth, channels, duration from files

## Quick Start

1. Copy the environment file and configure paths:
   ```bash
   cp .env.example .env
   # Edit .env to set DATA_PATH and AUDIO_PATH
   ```

2. Build and start the containers:
   ```bash
   docker compose build
   docker compose up -d
   ```

3. Access the web interface at http://localhost:3000

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATA_PATH` | Host path for database, logs, and cache (read-write) | `/srv/sample-browser/data` |
| `AUDIO_PATH` | Host path for audio files (read-only) | `/srv/audio/samples` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUID` | `568` | User ID for container processes |
| `PGID` | `568` | Group ID for container processes |
| `TZ` | `America/Chicago` | Timezone |
| `PUBLISHED_PORT` | `3000` | Web interface port |
| `SCAN_ON_STARTUP` | `true` | Scan audio directory on startup |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warning, error) |

## Supported Audio Formats

| Format | Extension(s) | Notes |
|--------|--------------|-------|
| WAV | `.wav` | Native browser playback |
| MP3 | `.mp3` | Native browser playback |
| AIFF | `.aif`, `.aiff` | Native browser playback |
| FLAC | `.flac` | Native browser playback |
| OGG | `.ogg` | Native browser playback |
| M4A/AAC | `.m4a` | Native browser playback |
| WMA | `.wma` | Native browser playback |
| CAF | `.caf` | Server-side transcoding to WAV (cached) |
| MIDI | `.mid`, `.midi` | FluidSynth synthesis to WAV (cached) |

## Filename Parsing

The application extracts metadata from audio filenames using common naming patterns:

| Example Filename | Extracted Metadata |
|-----------------|-------------------|
| `Funky_Bass_Cmaj_120bpm.wav` | Instrument: Bass, Key: C major, Tempo: 120 BPM, Descriptor: funky |
| `808_Kick_Hard.wav` | Instrument: 808, Descriptors: kick, hard |
| `Piano_Chords_G_minor_85bpm.wav` | Instrument: Piano, Key: G minor, Tempo: 85 BPM, Descriptor: chords |
| `Drums_4-4_140bpm_Loop.wav` | Instrument: Drums, Time Sig: 4/4, Tempo: 140 BPM, Loop: yes |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/samples` | List samples with pagination and filters |
| `GET` | `/api/samples/{id}` | Get single sample |
| `GET` | `/api/samples/{id}/audio` | Stream audio file (with transcoding if needed) |
| `GET` | `/api/samples/search?q=` | Full-text search |
| `GET` | `/api/samples/directories` | List directories with counts |
| `GET` | `/api/samples/instruments` | List instruments with counts |
| `GET` | `/api/samples/keys` | List key signatures with counts |
| `GET` | `/api/samples/genres` | List genres with counts |
| `GET` | `/api/samples/file-types` | List file types with counts |
| `GET` | `/api/samples/directory-image` | Get cover art for a directory |
| `POST` | `/api/samples/scan` | Trigger rescan |
| `GET` | `/api/samples/scan/status` | Get scan status |
| `POST` | `/api/samples/upload` | Upload new audio files |
| `GET` | `/api/health` | Health check |

### Filter Parameters

The `/api/samples` endpoint supports extensive filtering:

- `q` - Full-text search query
- `directory` - Filter by directory path (prefix match)
- `instrument` - Filter by instrument (comma-separated for multiple)
- `genre` - Filter by genre (comma-separated for multiple)
- `key` - Filter by key signature (comma-separated for multiple)
- `scale` - Filter by scale type (major/minor)
- `tempo_min`, `tempo_max` - BPM range
- `duration_min`, `duration_max` - Duration range (seconds)
- `bars_min`, `bars_max` - Length range (bars)
- `sample_type` - Filter by audio or midi
- `is_loop` - Filter by loop (true) or one-shot (false)
- `is_processed` - Filter by processed (true) or dry (false)
- `is_polyphonic` - Filter by polyphonic (true) or monophonic (false)
- `time_signature` - Filter by time signature
- `sample_rate_min`, `sample_rate_max` - Sample rate range (Hz)
- `bit_depth` - Filter by bit depth
- `channels` - Filter by channels (1=mono, 2=stereo)
- `file_size_min`, `file_size_max` - File size range (bytes)
- `file_extension` - Filter by extension (comma-separated)
- `created_at_min`, `created_at_max` - Date range
- `ids` - Filter by specific IDs (for favorites)
- `sort_by`, `sort_order` - Sorting options

## Architecture

```
sample-browser/
├── backend/              # FastAPI Python backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # FastAPI entry point
│       ├── config.py         # Settings from env vars
│       ├── database/
│       │   ├── connection.py # SQLite connection
│       │   └── schema.py     # Tables + FTS5
│       ├── models/
│       │   ├── sample.py     # Pydantic models
│       │   └── search.py     # Request/response models
│       ├── services/
│       │   ├── scanner.py    # Directory scanner
│       │   ├── parser.py     # Filename metadata parser
│       │   ├── indexer.py    # Database indexer
│       │   └── images.py     # Directory cover art service
│       └── routers/
│           ├── samples.py    # CRUD + search + audio streaming
│           └── health.py     # Health check
└── frontend/             # Next.js React frontend
    ├── Dockerfile
    ├── package.json
    └── app/
        ├── layout.tsx
        ├── page.tsx
        ├── globals.css           # CSS variables theming
        ├── components/
        │   ├── SampleBrowser.tsx # Main container
        │   ├── SampleCard.tsx    # Grid/list item
        │   ├── SampleTable.tsx   # Table view
        │   ├── SearchBar.tsx     # Search input
        │   ├── FilterPanel.tsx   # Filters sidebar
        │   ├── AudioPlayer.tsx   # Playback controls
        │   ├── Waveform.tsx      # Waveform visualization
        │   ├── DirectoryTree.tsx # Hierarchical directory browser
        │   ├── DirectoryPath.tsx # Breadcrumb path display
        │   ├── DirectoryImage.tsx# Cover art display
        │   ├── MultiSelect.tsx   # Multi-select dropdown
        │   ├── RangeSlider.tsx   # Dual-handle range slider
        │   ├── SettingsModal.tsx # Settings & backup UI
        │   └── Pagination.tsx
        └── lib/
            ├── types/            # TypeScript types
            ├── api/client.ts     # API client
            └── context/
                ├── SettingsContext.tsx  # View/display settings
                ├── FavoritesContext.tsx # Favorites management
                └── AudioContext.tsx     # Global audio playback
```

## Data Storage

The `/data` volume contains:
- `samples.db` - SQLite database with FTS5 full-text search
- `midi_cache/` - Cached WAV files from MIDI synthesis
- `transcode_cache/` - Cached WAV files from CAF/ALAC transcoding

Cache files use MD5 hashes of filepath + modification time, ensuring automatic invalidation when source files change.

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Traefik Integration

The application includes labels for Traefik reverse proxy integration. To enable:

1. Ensure Traefik is running on the same Docker network
2. Set `TRAEFIK_ENABLE=true` in `.env`
3. Configure your domain: `DOMAIN=yourdomain.com`

The application will be available at `https://sample-browser.yourdomain.com`

## Homepage Dashboard

Labels are included for Homepage dashboard integration:

```yaml
homepage.group: Media
homepage.name: Sample Browser
homepage.icon: audio-wave.svg
homepage.description: Audio sample/loop browser
```

## License

This project is licensed under the GNU General Public License v2.0 - see the [LICENSE.md](LICENSE.md) file for details.
