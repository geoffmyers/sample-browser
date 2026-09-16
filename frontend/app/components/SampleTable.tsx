"use client";

import type { Sample } from "../lib/types/sample";
import { useFavorites } from "../lib/context/FavoritesContext";
import { useSettings, type MetadataField } from "../lib/context/SettingsContext";
import { getDownloadUrl } from "../lib/api/client";
import { getInstrumentIcon, getInstrumentCategory } from "../lib/utils/instrumentIcons";
import AudioPlayer from "./AudioPlayer";
import DirectoryPath from "./DirectoryPath";

// Map table column classes to MetadataField names
const COLUMN_TO_FIELD: Record<string, MetadataField> = {
  "col-filepath": "filePath",
  "col-filetype": "fileType",
  "col-instrument": "instrument",
  "col-genre": "genre",
  "col-tempo": "tempo",
  "col-key": "key",
  "col-time-sig": "timeSignature",
  "col-bars": "bars",
  "col-duration": "duration",
  "col-format": "sampleType",
  "col-loop-type": "loopType",
  "col-processed": "isProcessed",
  "col-polyphonic": "isPolyphonic",
  "col-sample-rate": "sampleRate",
  "col-bit-depth": "bitDepth",
  "col-channels": "channels",
  "col-size": "fileSize",
  "col-date-added": "dateAdded",
};

type SortField = "filename" | "directory" | "tempo_bpm" | "key_signature" | "created_at" | "duration_seconds" | "length_bars" | "instrument" | "genre" | "time_signature" | "is_loop" | "is_processed" | "is_polyphonic" | "sample_type" | "sample_rate" | "bit_depth" | "channels" | "file_size_bytes" | "file_extension";
type SortOrder = "asc" | "desc";

interface SampleTableProps {
  samples: Sample[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  onSort?: (field: SortField) => void;
}

// Map column names to sort fields
const SORTABLE_COLUMNS: Record<string, SortField> = {
  "col-filename": "filename",
  "col-filepath": "directory",
  "col-filetype": "file_extension",
  "col-tempo": "tempo_bpm",
  "col-key": "key_signature",
  "col-bars": "length_bars",
  "col-duration": "duration_seconds",
  "col-instrument": "instrument",
  "col-genre": "genre",
  "col-time-sig": "time_signature",
  "col-format": "sample_type",
  "col-loop-type": "is_loop",
  "col-processed": "is_processed",
  "col-polyphonic": "is_polyphonic",
  "col-sample-rate": "sample_rate",
  "col-bit-depth": "bit_depth",
  "col-channels": "channels",
  "col-size": "file_size_bytes",
  "col-date-added": "created_at",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBars(bars: number | null): string {
  if (bars === null) return "-";
  // Round to nearest whole number for common bar lengths
  const rounded = Math.round(bars);
  return `${rounded}`;
}

function formatSampleRate(rate: number | null): string {
  if (rate === null) return "-";
  return `${(rate / 1000).toFixed(1)} kHz`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Sort indicator component
function SortIndicator({ field, currentField, order }: { field: SortField; currentField?: SortField; order?: SortOrder }) {
  const isActive = field === currentField;

  return (
    <span className={`sort-indicator ${isActive ? "active" : ""}`}>
      {isActive && order === "asc" && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      )}
      {isActive && order === "desc" && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      )}
      {!isActive && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
          <path d="m7 15 5 5 5-5"/>
          <path d="m7 9 5-5 5 5"/>
        </svg>
      )}
    </span>
  );
}

export default function SampleTable({ samples, sortBy, sortOrder, onSort }: SampleTableProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { settings } = useSettings();
  const { visibleFields } = settings;

  // Helper to check if a column should be visible
  const isColumnVisible = (columnClass: string): boolean => {
    const field = COLUMN_TO_FIELD[columnClass];
    // Columns without a corresponding field (like filename, play, actions) are always visible
    if (!field) return true;
    return visibleFields.includes(field);
  };

  const handleDownload = (sample: Sample) => {
    const url = getDownloadUrl(sample.id);
    const link = document.createElement("a");
    link.href = url;
    link.download = sample.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHeaderClick = (columnClass: string) => {
    const field = SORTABLE_COLUMNS[columnClass];
    if (field && onSort) {
      onSort(field);
    }
  };

  const renderSortableHeader = (columnClass: string, label: string) => {
    // Check if column should be visible based on settings
    if (!isColumnVisible(columnClass)) {
      return null;
    }

    const field = SORTABLE_COLUMNS[columnClass];
    if (!field) {
      return <th className={columnClass}>{label}</th>;
    }

    return (
      <th
        className={`${columnClass} sortable ${sortBy === field ? "sorted" : ""}`}
        onClick={() => handleHeaderClick(columnClass)}
        title={`Sort by ${label}`}
      >
        <span className="th-content">
          {label}
          <SortIndicator field={field} currentField={sortBy} order={sortOrder} />
        </span>
      </th>
    );
  };

  return (
    <div className="sample-table-container">
      <table className="sample-table">
        <thead>
          <tr>
            <th className="col-play">Play</th>
            <th className="col-favorite"></th>
            <th className="col-icon"></th>
            {renderSortableHeader("col-filename", "File Name")}
            {renderSortableHeader("col-filepath", "File Path")}
            {renderSortableHeader("col-filetype", "File Type")}
            {renderSortableHeader("col-instrument", "Instrument")}
            {renderSortableHeader("col-genre", "Genre")}
            {renderSortableHeader("col-tempo", "Tempo")}
            {renderSortableHeader("col-key", "Key")}
            {renderSortableHeader("col-time-sig", "Time")}
            {renderSortableHeader("col-bars", "Bars")}
            {renderSortableHeader("col-duration", "Duration")}
            {renderSortableHeader("col-format", "Format")}
            {renderSortableHeader("col-loop-type", "Type")}
            {renderSortableHeader("col-processed", "Processing")}
            {renderSortableHeader("col-polyphonic", "Polyphony")}
            {renderSortableHeader("col-sample-rate", "Sample Rate")}
            {renderSortableHeader("col-bit-depth", "Bit Depth")}
            {renderSortableHeader("col-channels", "Ch")}
            {renderSortableHeader("col-size", "Size")}
            {renderSortableHeader("col-date-added", "Added")}
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => {
            const favorite = isFavorite(sample.id);
            const instrumentCategory = getInstrumentCategory(sample.instrument);

            return (
              <tr key={sample.id}>
                <td className="col-play">
                  <AudioPlayer sampleId={sample.id} duration={sample.durationSeconds} compact />
                </td>
                <td className="col-favorite">
                  <button
                    className={`table-action-btn favorite-btn ${favorite ? "active" : ""}`}
                    onClick={() => toggleFavorite(sample.id)}
                    title={favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill={favorite ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                      />
                    </svg>
                  </button>
                </td>
                <td className="col-icon">
                  <div className={`table-instrument-icon instrument-${instrumentCategory}`}>
                    {getInstrumentIcon(sample.instrument)}
                  </div>
                </td>
                <td className="col-filename" title={sample.filename}>
                  <span className="filename-text">{sample.filename}</span>
                </td>
                {isColumnVisible("col-filepath") && (
                  <td className="col-filepath" title={sample.directory || "Root"}>
                    <span className="filepath-text">
                      <DirectoryPath path={sample.directory} />
                    </span>
                  </td>
                )}
                {isColumnVisible("col-filetype") && (
                  <td className="col-filetype">
                    {sample.fileExtension ? sample.fileExtension.toUpperCase() : "-"}
                  </td>
                )}
                {isColumnVisible("col-instrument") && (
                  <td className="col-instrument">{sample.instrument || "-"}</td>
                )}
                {isColumnVisible("col-genre") && (
                  <td className="col-genre">{sample.genre || "-"}</td>
                )}
                {isColumnVisible("col-tempo") && (
                  <td className="col-tempo">
                    {sample.tempoBpm ? `${sample.tempoBpm} BPM` : "-"}
                  </td>
                )}
                {isColumnVisible("col-key") && (
                  <td className="col-key">{sample.fullKey || "-"}</td>
                )}
                {isColumnVisible("col-time-sig") && (
                  <td className="col-time-sig">{sample.timeSignature || "-"}</td>
                )}
                {isColumnVisible("col-bars") && (
                  <td className="col-bars">{formatBars(sample.lengthBars)}</td>
                )}
                {isColumnVisible("col-duration") && (
                  <td className="col-duration">{formatDuration(sample.durationSeconds)}</td>
                )}
                {isColumnVisible("col-format") && (
                  <td className="col-format">
                    {sample.sampleType === "midi" ? "MIDI" : "Audio"}
                  </td>
                )}
                {isColumnVisible("col-loop-type") && (
                  <td className="col-loop-type">
                    {sample.isLoop === true ? "Loop" : sample.isLoop === false ? "One-Shot" : "-"}
                  </td>
                )}
                {isColumnVisible("col-processed") && (
                  <td className="col-processed">
                    {sample.isProcessed === true ? "Processed" : sample.isProcessed === false ? "Dry" : "-"}
                  </td>
                )}
                {isColumnVisible("col-polyphonic") && (
                  <td className="col-polyphonic">
                    {sample.isPolyphonic === true ? "Poly" : sample.isPolyphonic === false ? "Mono" : "-"}
                  </td>
                )}
                {isColumnVisible("col-sample-rate") && (
                  <td className="col-sample-rate">{formatSampleRate(sample.sampleRate)}</td>
                )}
                {isColumnVisible("col-bit-depth") && (
                  <td className="col-bit-depth">
                    {sample.bitDepth ? `${sample.bitDepth}-bit` : "-"}
                  </td>
                )}
                {isColumnVisible("col-channels") && (
                  <td className="col-channels">
                    {sample.channels ? (sample.channels === 1 ? "Mono" : "Stereo") : "-"}
                  </td>
                )}
                {isColumnVisible("col-size") && (
                  <td className="col-size">{formatFileSize(sample.fileSizeBytes)}</td>
                )}
                {isColumnVisible("col-date-added") && (
                  <td className="col-date-added">{formatDate(sample.createdAt)}</td>
                )}
                <td className="col-actions">
                  <button
                    className="table-action-btn download-btn"
                    onClick={() => handleDownload(sample)}
                    title="Download sample"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
