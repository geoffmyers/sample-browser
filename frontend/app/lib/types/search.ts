/**
 * Search and filter type definitions
 */

export interface SearchFilters {
  q: string;
  directory: string | null;
  instrument: string[];  // Array for multi-select
  tempoMin: number | null;
  tempoMax: number | null;
  key: string[];  // Array for multi-select
  scale: "major" | "minor" | null;
  genre: string[];  // Array for multi-select
  barsMin: number | null;
  barsMax: number | null;
  durationMin: number | null;
  durationMax: number | null;
  // Extended classification filters
  sampleType: "audio" | "midi" | null;
  isLoop: boolean | null;
  isProcessed: boolean | null;
  isPolyphonic: boolean | null;
  timeSignature: string | null;
  // Audio properties filters
  sampleRateMin: number | null;
  sampleRateMax: number | null;
  bitDepth: number | null;  // 16, 24, 32
  channels: number | null;  // 1 = mono, 2 = stereo
  fileSizeMin: number | null;
  fileSizeMax: number | null;
  // File type filter (e.g. .wav, .mp3, .mid)
  fileType: string[];  // Array for multi-select
  // Tags/descriptors filter
  descriptors: string | null;
  // Date range filter
  createdAtMin: string | null;  // ISO date string YYYY-MM-DD
  createdAtMax: string | null;  // ISO date string YYYY-MM-DD
  favoritesOnly: boolean;
  sortBy: "filename" | "directory" | "tempo_bpm" | "key_signature" | "created_at" | "duration_seconds" | "length_bars" | "instrument" | "genre" | "time_signature" | "is_loop" | "is_processed" | "is_polyphonic" | "sample_type" | "sample_rate" | "bit_depth" | "channels" | "file_size_bytes" | "file_extension";
  sortOrder: "asc" | "desc";
}

export const DEFAULT_FILTERS: SearchFilters = {
  q: "",
  directory: null,
  instrument: [],
  tempoMin: null,
  tempoMax: null,
  key: [],
  scale: null,
  genre: [],
  barsMin: null,
  barsMax: null,
  durationMin: null,
  durationMax: null,
  sampleType: null,
  isLoop: null,
  isProcessed: null,
  isPolyphonic: null,
  timeSignature: null,
  sampleRateMin: null,
  sampleRateMax: null,
  bitDepth: null,
  channels: null,
  fileSizeMin: null,
  fileSizeMax: null,
  fileType: [],
  descriptors: null,
  createdAtMin: null,
  createdAtMax: null,
  favoritesOnly: false,
  sortBy: "filename",
  sortOrder: "asc",
};

export interface PaginationState {
  page: number;
  perPage: number;
  total: number;
  pages: number;
}

export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  perPage: 50,
  total: 0,
  pages: 1,
};
