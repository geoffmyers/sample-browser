# Sample Browser Roadmap

## To Do

(No pending tasks)

## Done

- [x] Expand the width of the main container to fill the full browser width for better use of space on large screens. Removed max-width constraints from .header-content and .main-content CSS classes.
- [x] Allow sorting by column headers in the detailed table view. Added sortable column headers with sort indicators to SampleTable component. Click once for ascending, click again for descending. Sortable columns: File Name, Tempo, Key, Bars, Duration.

- [x] Split the combined File Name/Path field into separate fields (File Name and File Path) and do not display the File Path by default in any views. Added "filePath" as a toggleable metadata field in Settings. SampleTable now has separate File Name and File Path columns. SampleCard conditionally shows directory path based on settings.
- [x] Add CAF/ALAC support for audio playback in the browser. Added server-side transcoding using ffmpeg to convert CAF files to WAV format on-the-fly when streaming. The `stream_audio` endpoint detects CAF files and automatically transcodes them for browser playback.
- [x] Fix vertical alignment of icons in .sample-tag elements. Updated CSS with `display: inline-flex`, `align-items: center`, `line-height: 1`, and `vertical-align: middle` for proper icon alignment.
- [x] Replace forward slash characters with right arrow icons in directory path display. Created DirectoryPath.tsx component that renders path segments with chevron-right SVG icons between them. Updated SampleCard and SampleTable to use the new component.
- [x] Scan for images in sample directories and display them. Created images.py service that searches for cover art (cover.jpg, artwork.png, etc.) in sample directories and parent directories. Added `/api/samples/directory-image` endpoint. Created DirectoryImage.tsx component that displays cover art in sample cards when available.

- [x] Fix Length (Bars) filter (range slider), which was not calculating bar lengths for samples. Added database migration to calculate `length_bars = (tempo_bpm / 60) * duration_seconds / 4` assuming 4/4 time signature.
- [x] Fix waveform audio decoding errors in browser console. Changed waveform visualization to lazy-load only when user clicks play, preventing hundreds of failed decode attempts for unsupported audio formats (CAF/AAC).
- [x] Add sample length (duration in seconds) as a filter option as a range slider.
- [x] Only allow playback of a single audio file in the browser at a time. When a new audio file is played, stop any currently playing audio.
- [x] Add all parent directory names as individual descriptors/tags to each sample.
- [x] Show audio waveform visualizations for each sample.
- [x] Show instrument-specific icon instead of generic audio icon for each sample.
- [x] Allow users to upload multiple new audio files directly through the web interface.
- [x] Update Directory filter to be hierarchical/nested tree view for easier navigation and selection. Allow users to expand/collapse directories.
- [x] Add support for CAF audio files (AAC/PCM codecs) in addition to WAV, AIFF, FLAC, OGG, MP3, and AAC/M4A formats.
- [x] Add detailed table view in addition to existing grid view and list view. Include columns for instrument, genre, tempo, key signature, scale type, sample rate, bit depth, duration, file size, etc.
- [x] Replace Tempo (BPM) and Length (Bars) filters with range sliders for more precise filtering.
- [x] Add all fields listed in SAMPLE_FIELDS.md to the database schema and ensure they are indexed for displaying, filtering, searching, and sorting.
- [x] Add support for CAF files with Apple Lossless Audio Codec (ALAC) encoding. Added ffprobe fallback in scanner.py for metadata extraction from formats not supported by mutagen.
- [x] Fix "Show favorites only" filter bug. Previously filtered client-side after pagination, causing empty results. Now passes favorite IDs to backend API for proper server-side filtering with pagination.
- [x] Add SVG icons for metadata fields (genre, key, tempo, duration, descriptors). Created metadataIcons.tsx with genre-specific icons and metadata type icons displayed in sample card tags.
- [x] Add settings modal to customize visible metadata fields on sample cards. Users can toggle which fields (instrument, genre, key, tempo, duration, bars, descriptors, sample type, time signature) appear on grid/list view cards.
- [x] Add sort dropdown in header to sort samples by filename, tempo, key, duration, length (bars), or date added. Supports ascending/descending order toggle.
- [x] Replace custom SVG icons with Font Awesome icons for metadata fields and instrument categories. Installed @fortawesome/react-fontawesome package.
- [x] Replace radio buttons for Key, Genre, and Instrument with multi-select dropdowns. Created MultiSelect.tsx component with search, select all, and clear functionality. Updated backend to support comma-separated filter values using SQL IN clause.
- [x] Fix waveform visualization not displaying. The .audio-progress container height was 4px but waveform height was 32px. Updated CSS to match heights and added proper fallback progress bar styling.
- [x] Add loop/repeat playback toggle in header. Added loopAudio setting to BrowserSettings with toggle button that applies loop attribute to all audio elements.
- [x] Add favorites and settings backup/export and restore/import functionality. Added export/import functions to SettingsContext and FavoritesContext. Created backup UI in SettingsModal with JSON file download and import.
- [x] Add support for MIDI samples alongside audio samples. Added .mid/.midi extensions to config, mido library for MIDI metadata extraction (tempo, time signature, duration, track count), and MIDI icon using Font Awesome keyboard icon.
- [x] Add file type filter to filter samples by file extension (.wav, .mp3, .mid, etc.). Added FileTypeInfo model, `/api/samples/file-types` endpoint, and multi-select dropdown in FilterPanel.
- [x] Add complete filter/sort/display parity for all sample fields. All fields in SAMPLE_FIELDS.md now have corresponding filters, sorting options, and visible field toggles (processed/dry, polyphonic/mono, sample rate, bit depth, channels, file size, date added, descriptors).
- [x] Fix MIDI file playback in browser. Added FluidSynth synthesis to convert MIDI files to WAV format on-the-fly using the FluidR3_GM soundfont. The `stream_audio` endpoint detects MIDI files and automatically synthesizes them for browser playback.
- [x] Fix favorites toggle causing audio playback to stop and screen to re-render. Changed useCallback dependency to only include favorites when `filters.favoritesOnly` is true, preventing unnecessary refetches.
- [x] Add MIDI synthesis caching for faster repeat playback. Cached WAV files stored in `/data/midi_cache/` using MD5 hash of filepath + modification time. Improves repeat playback performance by ~4x.
- [x] Add CAF/ALAC transcoding cache for faster repeat playback. Cached WAV files stored in `/data/transcode_cache/` using MD5 hash of filepath + modification time. Improves repeat playback performance by ~5x.
