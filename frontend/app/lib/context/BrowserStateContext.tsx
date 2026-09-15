"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { SearchFilters } from "../types/search";
import { DEFAULT_FILTERS } from "../types/search";

const STORAGE_KEY = "sampleBrowser_browserState";

export interface BrowserState {
  filters: SearchFilters;
  page: number;
}

export const DEFAULT_BROWSER_STATE: BrowserState = {
  filters: DEFAULT_FILTERS,
  page: 1,
};

interface BrowserStateContextType {
  filters: SearchFilters;
  page: number;
  setFilters: (filters: SearchFilters) => void;
  updateFilters: (updates: Partial<SearchFilters>) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  isHydrated: boolean;
}

const BrowserStateContext = createContext<BrowserStateContextType | null>(null);

/**
 * Validates and sanitizes filters loaded from localStorage
 * to ensure they match the expected schema
 */
function validateFilters(stored: unknown): Partial<SearchFilters> {
  if (!stored || typeof stored !== "object") {
    return {};
  }

  const filters = stored as Record<string, unknown>;
  const validated: Partial<SearchFilters> = {};

  // String fields
  if (typeof filters.q === "string") validated.q = filters.q;
  if (typeof filters.directory === "string" || filters.directory === null) {
    validated.directory = filters.directory as string | null;
  }
  if (typeof filters.descriptors === "string" || filters.descriptors === null) {
    validated.descriptors = filters.descriptors as string | null;
  }
  if (typeof filters.timeSignature === "string" || filters.timeSignature === null) {
    validated.timeSignature = filters.timeSignature as string | null;
  }
  if (typeof filters.createdAtMin === "string" || filters.createdAtMin === null) {
    validated.createdAtMin = filters.createdAtMin as string | null;
  }
  if (typeof filters.createdAtMax === "string" || filters.createdAtMax === null) {
    validated.createdAtMax = filters.createdAtMax as string | null;
  }

  // Array fields
  if (Array.isArray(filters.instrument)) {
    validated.instrument = filters.instrument.filter((i): i is string => typeof i === "string");
  }
  if (Array.isArray(filters.key)) {
    validated.key = filters.key.filter((k): k is string => typeof k === "string");
  }
  if (Array.isArray(filters.genre)) {
    validated.genre = filters.genre.filter((g): g is string => typeof g === "string");
  }
  if (Array.isArray(filters.fileType)) {
    validated.fileType = filters.fileType.filter((f): f is string => typeof f === "string");
  }

  // Number fields (nullable)
  const numberFields = [
    "tempoMin", "tempoMax", "barsMin", "barsMax",
    "durationMin", "durationMax", "sampleRateMin", "sampleRateMax",
    "bitDepth", "channels", "fileSizeMin", "fileSizeMax"
  ] as const;

  for (const field of numberFields) {
    if (typeof filters[field] === "number" || filters[field] === null) {
      (validated as Record<string, number | null>)[field] = filters[field] as number | null;
    }
  }

  // Enum fields
  if (filters.scale === "major" || filters.scale === "minor" || filters.scale === null) {
    validated.scale = filters.scale;
  }
  if (filters.sampleType === "audio" || filters.sampleType === "midi" || filters.sampleType === null) {
    validated.sampleType = filters.sampleType;
  }

  // Boolean fields (nullable)
  const booleanFields = ["isLoop", "isProcessed", "isPolyphonic"] as const;
  for (const field of booleanFields) {
    if (typeof filters[field] === "boolean" || filters[field] === null) {
      (validated as Record<string, boolean | null>)[field] = filters[field] as boolean | null;
    }
  }

  // Boolean fields (non-nullable)
  if (typeof filters.favoritesOnly === "boolean") {
    validated.favoritesOnly = filters.favoritesOnly;
  }

  // Sort fields
  const validSortBy = [
    "filename", "directory", "tempo_bpm", "key_signature", "created_at",
    "duration_seconds", "length_bars", "instrument", "genre", "time_signature",
    "is_loop", "is_processed", "is_polyphonic", "sample_type", "sample_rate",
    "bit_depth", "channels", "file_size_bytes", "file_extension"
  ];
  if (typeof filters.sortBy === "string" && validSortBy.includes(filters.sortBy)) {
    validated.sortBy = filters.sortBy as SearchFilters["sortBy"];
  }
  if (filters.sortOrder === "asc" || filters.sortOrder === "desc") {
    validated.sortOrder = filters.sortOrder;
  }

  return validated;
}

export function BrowserStateProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [page, setPageState] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate and merge filters
        const validatedFilters = validateFilters(parsed.filters);
        setFiltersState({ ...DEFAULT_FILTERS, ...validatedFilters });

        // Validate page
        if (typeof parsed.page === "number" && parsed.page >= 1) {
          setPageState(parsed.page);
        }
      }
    } catch (error) {
      console.error("Failed to load browser state:", error);
    }
    setIsHydrated(true);
  }, []);

  // Save state to localStorage when changed
  useEffect(() => {
    if (isHydrated) {
      const state: BrowserState = { filters, page };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [filters, page, isHydrated]);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
    // Reset to page 1 when filters change
    setPageState(1);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPageState(1);
  }, []);

  return (
    <BrowserStateContext.Provider
      value={{
        filters,
        page,
        setFilters,
        updateFilters,
        setPage,
        resetFilters,
        isHydrated,
      }}
    >
      {children}
    </BrowserStateContext.Provider>
  );
}

export function useBrowserState() {
  const context = useContext(BrowserStateContext);
  if (!context) {
    throw new Error("useBrowserState must be used within BrowserStateProvider");
  }
  return context;
}
