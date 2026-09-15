/**
 * API client for Sample Browser backend
 */

import type {
  Sample,
  SampleListResponse,
  DirectoryInfo,
  InstrumentInfo,
  KeyInfo,
  GenreInfo,
  FileTypeInfo,
  ScanStatus,
  HealthStatus,
} from "../types/sample";
import type { SearchFilters } from "../types/search";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

// Maximum number of retry attempts
const MAX_RETRIES = 3;

// Base delay for exponential backoff (ms)
const BASE_DELAY = 1000;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
  const delay = BASE_DELAY * Math.pow(2, attempt);
  // Add random jitter (0-25% of delay)
  const jitter = delay * Math.random() * 0.25;
  return delay + jitter;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        // Check if this is a retryable error
        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
          const delay = getBackoffDelay(attempt);
          console.warn(`API request failed with ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-network errors (e.g., JSON parse errors)
      if (lastError.message.startsWith("API Error:")) {
        throw lastError;
      }

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt);
        console.warn(`API request failed: ${lastError.message}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error("API request failed after retries");
}

/**
 * List samples with pagination and filters
 */
export async function listSamples(
  page: number = 1,
  perPage: number = 50,
  filters: Partial<SearchFilters> = {},
  favoriteIds?: number[]
): Promise<SampleListResponse> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("per_page", perPage.toString());

  if (filters.q) params.set("q", filters.q);
  if (filters.directory) params.set("directory", filters.directory);
  if (filters.instrument && filters.instrument.length > 0) params.set("instrument", filters.instrument.join(","));
  if (filters.tempoMin) params.set("tempo_min", filters.tempoMin.toString());
  if (filters.tempoMax) params.set("tempo_max", filters.tempoMax.toString());
  if (filters.key && filters.key.length > 0) params.set("key", filters.key.join(","));
  if (filters.scale) params.set("scale", filters.scale);
  if (filters.genre && filters.genre.length > 0) params.set("genre", filters.genre.join(","));
  if (filters.barsMin) params.set("bars_min", filters.barsMin.toString());
  if (filters.barsMax) params.set("bars_max", filters.barsMax.toString());
  if (filters.durationMin) params.set("duration_min", filters.durationMin.toString());
  if (filters.durationMax) params.set("duration_max", filters.durationMax.toString());
  if (filters.sampleType) params.set("sample_type", filters.sampleType);
  if (filters.isLoop !== null && filters.isLoop !== undefined) params.set("is_loop", filters.isLoop.toString());
  if (filters.isProcessed !== null && filters.isProcessed !== undefined) params.set("is_processed", filters.isProcessed.toString());
  if (filters.isPolyphonic !== null && filters.isPolyphonic !== undefined) params.set("is_polyphonic", filters.isPolyphonic.toString());
  if (filters.timeSignature) params.set("time_signature", filters.timeSignature);
  if (filters.sampleRateMin) params.set("sample_rate_min", filters.sampleRateMin.toString());
  if (filters.sampleRateMax) params.set("sample_rate_max", filters.sampleRateMax.toString());
  if (filters.bitDepth) params.set("bit_depth", filters.bitDepth.toString());
  if (filters.channels) params.set("channels", filters.channels.toString());
  if (filters.fileSizeMin) params.set("file_size_min", filters.fileSizeMin.toString());
  if (filters.fileSizeMax) params.set("file_size_max", filters.fileSizeMax.toString());
  if (filters.fileType && filters.fileType.length > 0) params.set("file_extension", filters.fileType.join(","));
  if (filters.descriptors) params.set("descriptors", filters.descriptors);
  if (filters.createdAtMin) params.set("created_at_min", filters.createdAtMin);
  if (filters.createdAtMax) params.set("created_at_max", filters.createdAtMax);
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortOrder) params.set("sort_order", filters.sortOrder);

  // Pass favorite IDs to filter by specific samples
  if (favoriteIds && favoriteIds.length > 0) {
    params.set("ids", favoriteIds.join(","));
  }

  return fetchApi<SampleListResponse>(`/samples?${params.toString()}`);
}

/**
 * Get a single sample by ID
 */
export async function getSample(id: number): Promise<Sample> {
  return fetchApi<Sample>(`/samples/${id}`);
}

/**
 * Get audio URL for a sample
 */
export function getAudioUrl(id: number): string {
  return `${API_URL}/api/samples/${id}/audio`;
}

/**
 * Get download URL for a sample (with Content-Disposition header)
 */
export function getDownloadUrl(id: number): string {
  return `${API_URL}/api/samples/${id}/audio?download=true`;
}

/**
 * Get cover art/thumbnail image URL for a directory
 */
export function getDirectoryImageUrl(directory: string): string {
  return `${API_URL}/api/samples/directory-image?directory=${encodeURIComponent(directory)}`;
}

/**
 * Search samples with full-text search
 */
export async function searchSamples(
  query: string,
  limit: number = 20
): Promise<Sample[]> {
  const params = new URLSearchParams({ q: query, limit: limit.toString() });
  return fetchApi<Sample[]>(`/samples/search?${params.toString()}`);
}

/**
 * List all directories with sample counts
 */
export async function listDirectories(): Promise<DirectoryInfo[]> {
  return fetchApi<DirectoryInfo[]>("/samples/directories");
}

/**
 * List all instruments with sample counts
 */
export async function listInstruments(): Promise<InstrumentInfo[]> {
  return fetchApi<InstrumentInfo[]>("/samples/instruments");
}

/**
 * List all keys with sample counts
 */
export async function listKeys(): Promise<KeyInfo[]> {
  return fetchApi<KeyInfo[]>("/samples/keys");
}

/**
 * List all genres with sample counts
 */
export async function listGenres(): Promise<GenreInfo[]> {
  return fetchApi<GenreInfo[]>("/samples/genres");
}

/**
 * List all file types (extensions) with sample counts
 */
export async function listFileTypes(): Promise<FileTypeInfo[]> {
  return fetchApi<FileTypeInfo[]>("/samples/file-types");
}

/**
 * Get scan status
 */
export async function getScanStatus(): Promise<ScanStatus> {
  return fetchApi<ScanStatus>("/samples/scan/status");
}

/**
 * Trigger a scan
 */
export async function triggerScan(): Promise<{ status: string; message: string }> {
  return fetchApi("/samples/scan", { method: "POST" });
}

/**
 * Get health status
 */
export async function getHealth(): Promise<HealthStatus> {
  return fetchApi<HealthStatus>("/health");
}

/**
 * Upload response from the API
 */
export interface UploadResponse {
  uploaded: number;
  errors: number;
  files: Array<{
    filename: string;
    saved_as: string;
    path: string;
    size_bytes: number;
  }>;
  error_details: Array<{
    filename: string;
    error: string;
  }> | null;
}

/**
 * Upload multiple audio files
 */
export async function uploadFiles(
  files: File[],
  directory: string = "uploads"
): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const url = `${API_URL}/api/samples/upload?directory=${encodeURIComponent(directory)}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload Error: ${response.status} - ${error}`);
  }

  return response.json();
}
