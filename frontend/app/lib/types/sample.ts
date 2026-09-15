/**
 * Sample type definitions
 */

export interface Sample {
  id: number;
  filepath: string;
  filename: string;
  directory: string;
  fileExtension: string;
  fileSizeBytes: number | null;

  instrument: string | null;
  descriptors: string[];
  tempoBpm: number | null;
  keySignature: string | null;
  scaleType: "major" | "minor" | null;
  fullKey: string | null;
  genre: string | null;

  durationSeconds: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
  lengthBars: number | null;

  // Extended sample classification
  sampleType: "audio" | "midi";
  isLoop: boolean | null;
  isProcessed: boolean | null;
  isPolyphonic: boolean | null;
  timeSignature: string | null;

  createdAt: string | null;
  indexedAt: string;
}

export interface SampleListResponse {
  items: Sample[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface DirectoryInfo {
  path: string;
  name: string;
  sampleCount: number;
}

export interface InstrumentInfo {
  name: string;
  sampleCount: number;
}

export interface KeyInfo {
  keySignature: string;
  scaleType: string;
  sampleCount: number;
}

export interface GenreInfo {
  name: string;
  sampleCount: number;
}

export interface FileTypeInfo {
  extension: string;
  sampleCount: number;
}

export interface ScanStatus {
  status: "idle" | "scanning" | "complete" | "error" | "cancelled";
  progressPercent: number | null;
  filesScanned: number;
  filesTotal: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface HealthStatus {
  status: string;
  database: string;
  audioPath: string;
  totalSamples: number;
}
