"use client";

import { memo } from "react";
import type { Sample } from "../lib/types/sample";
import { useFavorites } from "../lib/context/FavoritesContext";
import { useSettings } from "../lib/context/SettingsContext";
import { getDownloadUrl } from "../lib/api/client";
import { getInstrumentIcon, getInstrumentCategory } from "../lib/utils/instrumentIcons";
import { KeyIcon, TempoIcon, DurationIcon, TagIcon, BarsIcon, LoopIcon, getGenreIcon } from "../lib/utils/metadataIcons";
import AudioPlayer from "./AudioPlayer";
import DirectoryPath from "./DirectoryPath";
import DirectoryImage from "./DirectoryImage";

interface SampleCardProps {
  sample: Sample;
  viewMode: "grid" | "list";
}

function SampleCard({ sample, viewMode }: SampleCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { settings } = useSettings();
  const { visibleFields } = settings;
  const favorite = isFavorite(sample.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(sample.id);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getDownloadUrl(sample.id);
    const link = document.createElement("a");
    link.href = url;
    link.download = sample.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const instrumentCategory = getInstrumentCategory(sample.instrument);

  return (
    <div className={`sample-card ${viewMode === "list" ? "sample-card-list" : ""}`}>
      <div className="sample-card-header">
        <DirectoryImage
          directory={sample.directory}
          className="sample-card-cover"
          size={40}
        />
        <div className={`sample-card-icon instrument-${instrumentCategory}`}>
          {getInstrumentIcon(sample.instrument)}
        </div>
        <div className="sample-card-title">
          <h3 title={sample.filename}>{sample.filename}</h3>
          {visibleFields.includes("filePath") && (
            <p className="sample-file-path">
              <DirectoryPath path={sample.directory} />
            </p>
          )}
        </div>
        <div className="sample-card-actions">
          <button
            className={`action-btn favorite-btn ${favorite ? "active" : ""}`}
            onClick={handleFavoriteClick}
            title={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
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
          <button
            className="action-btn download-btn"
            onClick={handleDownloadClick}
            title="Download sample"
            aria-label="Download sample"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
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
        </div>
      </div>

      <div className="sample-card-meta">
        {visibleFields.includes("instrument") && sample.instrument && (
          <span className="sample-tag instrument">{sample.instrument}</span>
        )}
        {visibleFields.includes("genre") && sample.genre && (
          <span className="sample-tag genre" title={`Genre: ${sample.genre}`}>
            <span className="tag-icon">{getGenreIcon(sample.genre)}</span>
            {sample.genre}
          </span>
        )}
        {visibleFields.includes("key") && sample.fullKey && (
          <span className="sample-tag key" title={`Key: ${sample.fullKey}`}>
            <span className="tag-icon">{KeyIcon}</span>
            {sample.fullKey}
          </span>
        )}
        {visibleFields.includes("tempo") && sample.tempoBpm && (
          <span className="sample-tag tempo" title={`Tempo: ${sample.tempoBpm} BPM`}>
            <span className="tag-icon">{TempoIcon}</span>
            {sample.tempoBpm} BPM
          </span>
        )}
        {visibleFields.includes("duration") && sample.durationSeconds && (
          <span className="sample-tag duration" title={`Duration: ${sample.durationSeconds.toFixed(2)}s`}>
            <span className="tag-icon">{DurationIcon}</span>
            {sample.durationSeconds.toFixed(1)}s
          </span>
        )}
        {visibleFields.includes("bars") && sample.lengthBars && (
          <span className="sample-tag bars" title={`Length: ${Math.round(sample.lengthBars)} bars`}>
            <span className="tag-icon">{BarsIcon}</span>
            {Math.round(sample.lengthBars)} bars
          </span>
        )}
        {visibleFields.includes("sampleType") && sample.isLoop !== null && (
          <span className="sample-tag sample-type" title={sample.isLoop ? "Loop" : "One-Shot"}>
            <span className="tag-icon">{LoopIcon}</span>
            {sample.isLoop ? "Loop" : "One-Shot"}
          </span>
        )}
        {visibleFields.includes("timeSignature") && sample.timeSignature && (
          <span className="sample-tag time-sig" title={`Time: ${sample.timeSignature}`}>
            {sample.timeSignature}
          </span>
        )}
        {visibleFields.includes("descriptors") && sample.descriptors.slice(0, 3).map((desc) => (
          <span key={desc} className="sample-tag descriptor" title={`Tag: ${desc}`}>
            <span className="tag-icon">{TagIcon}</span>
            {desc}
          </span>
        ))}
      </div>

      <AudioPlayer sampleId={sample.id} duration={sample.durationSeconds} />
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render when sample data or viewMode changes
export default memo(SampleCard, (prevProps, nextProps) => {
  return (
    prevProps.sample.id === nextProps.sample.id &&
    prevProps.viewMode === nextProps.viewMode
  );
});
