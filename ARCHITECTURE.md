# Architecture

Two services behind Docker Compose: a **FastAPI backend** that indexes and
serves an audio library, and a **Next.js frontend** that browses it.

## Layout

| Path | What lives there |
|---|---|
| `backend/app/main.py` | FastAPI entry point. |
| `backend/app/routers/` | HTTP surface — `samples.py` for search and retrieval, `health.py` for liveness. |
| `backend/app/services/` | The work: filesystem scanning, metadata extraction, waveform/image generation. |
| `backend/app/database/` | Schema and connection handling for the index. |
| `backend/app/models/` | Pydantic models shared by the routers and services. |
| `frontend/app/` | Next.js App Router UI. |

## How indexing works

The library directory is mounted **read-only**, scanned on start-up and, when
`WATCH_FOR_CHANGES` is on, watched with `watchfiles`.
Metadata comes from `mutagen` (audio tags), `ffprobe` (formats mutagen cannot
read, such as CAF) and `mido` (MIDI); `filetype` checks that uploaded files
really are audio. Results land in the index database. Indexing never modifies the library; the only route that writes to it
is the upload endpoint, which fails while the mount is read-only.

## Deployment note

The `docker-compose.yml` used in production is **not** published here — it
carries operator-specific paths and hostnames. `docker-compose.example.yml` is
the same deployment with neutral defaults and is the one to start from.
