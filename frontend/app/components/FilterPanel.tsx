"use client";

import { useState, useEffect, memo } from "react";
import type { SearchFilters } from "../lib/types/search";
import type { InstrumentInfo, KeyInfo, DirectoryInfo, GenreInfo, FileTypeInfo } from "../lib/types/sample";
import { listInstruments, listKeys, listDirectories, listGenres, listFileTypes } from "../lib/api/client";
import { useFavorites } from "../lib/context/FavoritesContext";
import DirectoryTree from "./DirectoryTree";
import RangeSlider from "./RangeSlider";
import MultiSelect from "./MultiSelect";

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (updates: Partial<SearchFilters>) => void;
  visible: boolean;
}

function FilterPanel({
  filters,
  onFilterChange,
  visible,
}: FilterPanelProps) {
  const { favorites } = useFavorites();
  const [instruments, setInstruments] = useState<InstrumentInfo[]>([]);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [genres, setGenres] = useState<GenreInfo[]>([]);
  const [fileTypes, setFileTypes] = useState<FileTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [instrumentData, keyData, dirData, genreData, fileTypeData] = await Promise.all([
          listInstruments(),
          listKeys(),
          listDirectories(),
          listGenres(),
          listFileTypes(),
        ]);
        setInstruments(instrumentData);
        setKeys(keyData);
        setDirectories(dirData);
        setGenres(genreData);
        setFileTypes(fileTypeData);
      } catch (error) {
        console.error("Failed to load filter options:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFilterOptions();
  }, []);

  const handleTempoChange = (min: number | null, max: number | null) => {
    onFilterChange({ tempoMin: min, tempoMax: max });
  };

  const handleBarsChange = (min: number | null, max: number | null) => {
    onFilterChange({ barsMin: min, barsMax: max });
  };

  const handleDurationChange = (min: number | null, max: number | null) => {
    onFilterChange({ durationMin: min, durationMax: max });
  };

  const handleSampleRateChange = (min: number | null, max: number | null) => {
    onFilterChange({ sampleRateMin: min, sampleRateMax: max });
  };

  const handleFileSizeChange = (min: number | null, max: number | null) => {
    // Convert from MB to bytes for the filter
    onFilterChange({
      fileSizeMin: min !== null ? min * 1024 * 1024 : null,
      fileSizeMax: max !== null ? max * 1024 * 1024 : null,
    });
  };

  const clearFilters = () => {
    onFilterChange({
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
    });
  };

  // Get unique keys for the multi-select
  const uniqueKeys = [...new Set(keys.map((k) => k.keySignature))].sort();
  const keyOptions = uniqueKeys.map((key) => ({
    value: key,
    label: key,
    count: keys.filter((k) => k.keySignature === key).reduce((a, b) => a + b.sampleCount, 0),
  }));

  const genreOptions = genres.map((g) => ({
    value: g.name,
    label: g.name,
    count: g.sampleCount,
  }));

  const instrumentOptions = instruments.map((inst) => ({
    value: inst.name,
    label: inst.name,
    count: inst.sampleCount,
  }));

  const fileTypeOptions = fileTypes.map((ft) => ({
    value: ft.extension,
    label: ft.extension.toUpperCase(),
    count: ft.sampleCount,
  }));

  if (isLoading) {
    return (
      <aside className={`filter-panel ${visible ? "" : "hidden"}`}>
        <div className="loading">
          <div className="loading-spinner" />
        </div>
      </aside>
    );
  }

  return (
    <aside className={`filter-panel ${visible ? "visible" : "hidden"}`}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Filters</h2>
        <button
          className="btn btn-secondary"
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          onClick={clearFilters}
        >
          Clear All
        </button>
      </div>

      {/* Favorites Only */}
      <div className="filter-section">
        <h3>Favorites</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={filters.favoritesOnly}
            onChange={(e) => onFilterChange({ favoritesOnly: e.target.checked })}
          />
          Show favorites only ({favorites.size})
        </label>
      </div>

      {/* Key Signature - Multi-select */}
      {keyOptions.length > 0 && (
        <div className="filter-section">
          <h3>Key</h3>
          <MultiSelect
            options={keyOptions}
            selected={filters.key}
            onChange={(selected) => onFilterChange({ key: selected })}
            placeholder="All Keys"
          />
        </div>
      )}

      {/* Genre - Multi-select */}
      {genreOptions.length > 0 && (
        <div className="filter-section">
          <h3>Genre</h3>
          <MultiSelect
            options={genreOptions}
            selected={filters.genre}
            onChange={(selected) => onFilterChange({ genre: selected })}
            placeholder="All Genres"
          />
        </div>
      )}

      {/* Instruments - Multi-select */}
      {instrumentOptions.length > 0 && (
        <div className="filter-section">
          <h3>Instrument</h3>
          <MultiSelect
            options={instrumentOptions}
            selected={filters.instrument}
            onChange={(selected) => onFilterChange({ instrument: selected })}
            placeholder="All Instruments"
          />
        </div>
      )}

      {/* Scale Type */}
      <div className="filter-section">
        <h3>Scale</h3>
        <label>
          <input
            type="radio"
            name="scale"
            checked={filters.scale === null}
            onChange={() => onFilterChange({ scale: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="scale"
            checked={filters.scale === "major"}
            onChange={() => onFilterChange({ scale: "major" })}
          />
          Major
        </label>
        <label>
          <input
            type="radio"
            name="scale"
            checked={filters.scale === "minor"}
            onChange={() => onFilterChange({ scale: "minor" })}
          />
          Minor
        </label>
      </div>

      {/* Tempo Range */}
      <div className="filter-section">
        <h3>Tempo (BPM)</h3>
        <RangeSlider
          min={20}
          max={300}
          step={5}
          minValue={filters.tempoMin}
          maxValue={filters.tempoMax}
          onChange={handleTempoChange}
          formatValue={(v) => `${v}`}
        />
      </div>

      {/* Bars Range */}
      <div className="filter-section">
        <h3>Length (Bars)</h3>
        <RangeSlider
          min={1}
          max={64}
          step={1}
          minValue={filters.barsMin}
          maxValue={filters.barsMax}
          onChange={handleBarsChange}
          formatValue={(v) => `${v}`}
        />
        <p className="filter-hint">Common: 4, 8, 16, 32 bars</p>
      </div>

      {/* Duration Range */}
      <div className="filter-section">
        <h3>Duration (Seconds)</h3>
        <RangeSlider
          min={0}
          max={300}
          step={1}
          minValue={filters.durationMin}
          maxValue={filters.durationMax}
          onChange={handleDurationChange}
          formatValue={(v) => `${v}s`}
        />
      </div>

      {/* Sample Type (Loop/One-Shot) */}
      <div className="filter-section">
        <h3>Sample Type</h3>
        <label>
          <input
            type="radio"
            name="isLoop"
            checked={filters.isLoop === null}
            onChange={() => onFilterChange({ isLoop: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="isLoop"
            checked={filters.isLoop === true}
            onChange={() => onFilterChange({ isLoop: true })}
          />
          Loops
        </label>
        <label>
          <input
            type="radio"
            name="isLoop"
            checked={filters.isLoop === false}
            onChange={() => onFilterChange({ isLoop: false })}
          />
          One-Shots
        </label>
      </div>

      {/* Time Signature */}
      <div className="filter-section">
        <h3>Time Signature</h3>
        <label>
          <input
            type="radio"
            name="timeSignature"
            checked={filters.timeSignature === null}
            onChange={() => onFilterChange({ timeSignature: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="timeSignature"
            checked={filters.timeSignature === "4/4"}
            onChange={() => onFilterChange({ timeSignature: "4/4" })}
          />
          4/4
        </label>
        <label>
          <input
            type="radio"
            name="timeSignature"
            checked={filters.timeSignature === "3/4"}
            onChange={() => onFilterChange({ timeSignature: "3/4" })}
          />
          3/4
        </label>
        <label>
          <input
            type="radio"
            name="timeSignature"
            checked={filters.timeSignature === "6/8"}
            onChange={() => onFilterChange({ timeSignature: "6/8" })}
          />
          6/8
        </label>
      </div>

      {/* Audio/MIDI Format */}
      <div className="filter-section">
        <h3>Format</h3>
        <label>
          <input
            type="radio"
            name="sampleType"
            checked={filters.sampleType === null}
            onChange={() => onFilterChange({ sampleType: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="sampleType"
            checked={filters.sampleType === "audio"}
            onChange={() => onFilterChange({ sampleType: "audio" })}
          />
          Audio
        </label>
        <label>
          <input
            type="radio"
            name="sampleType"
            checked={filters.sampleType === "midi"}
            onChange={() => onFilterChange({ sampleType: "midi" })}
          />
          MIDI
        </label>
      </div>

      {/* File Type - Multi-select */}
      {fileTypeOptions.length > 0 && (
        <div className="filter-section">
          <h3>File Type</h3>
          <MultiSelect
            options={fileTypeOptions}
            selected={filters.fileType}
            onChange={(selected) => onFilterChange({ fileType: selected })}
            placeholder="All File Types"
          />
        </div>
      )}

      {/* Sample Rate Range */}
      <div className="filter-section">
        <h3>Sample Rate (kHz)</h3>
        <RangeSlider
          min={8}
          max={192}
          step={1}
          minValue={filters.sampleRateMin !== null ? filters.sampleRateMin / 1000 : null}
          maxValue={filters.sampleRateMax !== null ? filters.sampleRateMax / 1000 : null}
          onChange={(min, max) => handleSampleRateChange(
            min !== null ? min * 1000 : null,
            max !== null ? max * 1000 : null
          )}
          formatValue={(v) => `${v}`}
        />
        <p className="filter-hint">Common: 44.1, 48, 96 kHz</p>
      </div>

      {/* Bit Depth */}
      <div className="filter-section">
        <h3>Bit Depth</h3>
        <label>
          <input
            type="radio"
            name="bitDepth"
            checked={filters.bitDepth === null}
            onChange={() => onFilterChange({ bitDepth: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="bitDepth"
            checked={filters.bitDepth === 16}
            onChange={() => onFilterChange({ bitDepth: 16 })}
          />
          16-bit
        </label>
        <label>
          <input
            type="radio"
            name="bitDepth"
            checked={filters.bitDepth === 24}
            onChange={() => onFilterChange({ bitDepth: 24 })}
          />
          24-bit
        </label>
        <label>
          <input
            type="radio"
            name="bitDepth"
            checked={filters.bitDepth === 32}
            onChange={() => onFilterChange({ bitDepth: 32 })}
          />
          32-bit
        </label>
      </div>

      {/* Channels */}
      <div className="filter-section">
        <h3>Channels</h3>
        <label>
          <input
            type="radio"
            name="channels"
            checked={filters.channels === null}
            onChange={() => onFilterChange({ channels: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="channels"
            checked={filters.channels === 1}
            onChange={() => onFilterChange({ channels: 1 })}
          />
          Mono
        </label>
        <label>
          <input
            type="radio"
            name="channels"
            checked={filters.channels === 2}
            onChange={() => onFilterChange({ channels: 2 })}
          />
          Stereo
        </label>
      </div>

      {/* Processed/Dry */}
      <div className="filter-section">
        <h3>Processing</h3>
        <label>
          <input
            type="radio"
            name="isProcessed"
            checked={filters.isProcessed === null}
            onChange={() => onFilterChange({ isProcessed: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="isProcessed"
            checked={filters.isProcessed === true}
            onChange={() => onFilterChange({ isProcessed: true })}
          />
          Processed
        </label>
        <label>
          <input
            type="radio"
            name="isProcessed"
            checked={filters.isProcessed === false}
            onChange={() => onFilterChange({ isProcessed: false })}
          />
          Dry
        </label>
      </div>

      {/* Polyphonic/Monophonic */}
      <div className="filter-section">
        <h3>Polyphony</h3>
        <label>
          <input
            type="radio"
            name="isPolyphonic"
            checked={filters.isPolyphonic === null}
            onChange={() => onFilterChange({ isPolyphonic: null })}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="isPolyphonic"
            checked={filters.isPolyphonic === true}
            onChange={() => onFilterChange({ isPolyphonic: true })}
          />
          Polyphonic
        </label>
        <label>
          <input
            type="radio"
            name="isPolyphonic"
            checked={filters.isPolyphonic === false}
            onChange={() => onFilterChange({ isPolyphonic: false })}
          />
          Monophonic
        </label>
      </div>

      {/* Tags/Descriptors Search */}
      <div className="filter-section">
        <h3>Tags/Descriptors</h3>
        <input
          type="text"
          className="filter-input"
          placeholder="Search tags..."
          value={filters.descriptors || ""}
          onChange={(e) => onFilterChange({ descriptors: e.target.value || null })}
        />
      </div>

      {/* Date Added Range */}
      <div className="filter-section">
        <h3>Date Added</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>From:</label>
          <input
            type="date"
            className="filter-input"
            value={filters.createdAtMin || ""}
            onChange={(e) => onFilterChange({ createdAtMin: e.target.value || null })}
          />
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>To:</label>
          <input
            type="date"
            className="filter-input"
            value={filters.createdAtMax || ""}
            onChange={(e) => onFilterChange({ createdAtMax: e.target.value || null })}
          />
        </div>
      </div>

      {/* File Size Range */}
      <div className="filter-section">
        <h3>File Size (MB)</h3>
        <RangeSlider
          min={0}
          max={100}
          step={1}
          minValue={filters.fileSizeMin !== null ? filters.fileSizeMin / (1024 * 1024) : null}
          maxValue={filters.fileSizeMax !== null ? filters.fileSizeMax / (1024 * 1024) : null}
          onChange={handleFileSizeChange}
          formatValue={(v) => `${v}`}
        />
      </div>

      {/* Directories */}
      {directories.length > 0 && (
        <div className="filter-section">
          <h3>Directory</h3>
          <DirectoryTree
            directories={directories}
            selectedDirectory={filters.directory}
            onSelect={(path) => onFilterChange({ directory: path })}
          />
        </div>
      )}
    </aside>
  );
}

// Memoize to prevent re-renders when parent state changes but filters don't
export default memo(FilterPanel);
