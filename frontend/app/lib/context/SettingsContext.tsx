"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const STORAGE_KEY = "sampleBrowser_settings";

// Metadata fields that can be shown/hidden across all views (grid, list, table)
export type MetadataField =
  | "instrument"
  | "genre"
  | "key"
  | "tempo"
  | "duration"
  | "bars"
  | "descriptors"
  | "sampleType"
  | "loopType"
  | "isProcessed"
  | "isPolyphonic"
  | "timeSignature"
  | "filePath"
  | "fileType"
  | "sampleRate"
  | "bitDepth"
  | "channels"
  | "fileSize"
  | "dateAdded";

export interface BrowserSettings {
  viewMode: "grid" | "list" | "table";
  itemsPerPage: number;
  showFilters: boolean;
  colorTheme: "dark" | "light";
  audioVolume: number;
  loopAudio: boolean;
  // Visible metadata fields across all views
  visibleFields: MetadataField[];
}

export const ALL_METADATA_FIELDS: MetadataField[] = [
  "filePath",
  "fileType",
  "instrument",
  "genre",
  "key",
  "tempo",
  "duration",
  "bars",
  "descriptors",
  "sampleType",
  "loopType",
  "isProcessed",
  "isPolyphonic",
  "timeSignature",
  "sampleRate",
  "bitDepth",
  "channels",
  "fileSize",
  "dateAdded",
];

export const FIELD_LABELS: Record<MetadataField, string> = {
  filePath: "File Path",
  fileType: "File Type",
  instrument: "Instrument",
  genre: "Genre",
  key: "Key",
  tempo: "Tempo (BPM)",
  duration: "Duration",
  bars: "Length (Bars)",
  descriptors: "Tags/Descriptors",
  sampleType: "Format (Audio/MIDI)",
  loopType: "Loop/One-Shot",
  isProcessed: "Processed/Dry",
  isPolyphonic: "Poly/Mono",
  timeSignature: "Time Signature",
  sampleRate: "Sample Rate",
  bitDepth: "Bit Depth",
  channels: "Channels",
  fileSize: "File Size",
  dateAdded: "Date Added",
};

export const DEFAULT_SETTINGS: BrowserSettings = {
  viewMode: "grid",
  itemsPerPage: 50,
  showFilters: true,
  colorTheme: "dark",
  audioVolume: 0.7,
  loopAudio: false,
  // Reduced default fields for better performance (8 essential fields)
  visibleFields: ["filePath", "instrument", "genre", "key", "tempo", "duration", "bars", "sampleType"],
};

interface SettingsContextType {
  settings: BrowserSettings;
  updateSettings: (updates: Partial<BrowserSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => BrowserSettings;
  importSettings: (newSettings: Partial<BrowserSettings>) => void;
  isHydrated: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BrowserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Apply theme to document
  useEffect(() => {
    if (isLoaded) {
      document.documentElement.setAttribute("data-theme", settings.colorTheme);
    }
  }, [settings.colorTheme, isLoaded]);

  const updateSettings = (updates: Partial<BrowserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const exportSettings = () => {
    return { ...settings };
  };

  const importSettings = (newSettings: Partial<BrowserSettings>) => {
    setSettings({ ...DEFAULT_SETTINGS, ...newSettings });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, exportSettings, importSettings, isHydrated: isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
