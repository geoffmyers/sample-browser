"use client";

import { useState, useRef, useEffect } from "react";
import type { SearchFilters } from "../lib/types/search";

interface SortDropdownProps {
  sortBy: SearchFilters["sortBy"];
  sortOrder: SearchFilters["sortOrder"];
  onSortChange: (sortBy: SearchFilters["sortBy"], sortOrder: SearchFilters["sortOrder"]) => void;
}

const SORT_OPTIONS: { value: SearchFilters["sortBy"]; label: string }[] = [
  { value: "filename", label: "Filename" },
  { value: "directory", label: "File Path" },
  { value: "instrument", label: "Instrument" },
  { value: "genre", label: "Genre" },
  { value: "key_signature", label: "Key" },
  { value: "tempo_bpm", label: "Tempo (BPM)" },
  { value: "duration_seconds", label: "Duration" },
  { value: "length_bars", label: "Length (Bars)" },
  { value: "time_signature", label: "Time Signature" },
  { value: "is_loop", label: "Loop/One-Shot" },
  { value: "sample_rate", label: "Sample Rate" },
  { value: "bit_depth", label: "Bit Depth" },
  { value: "channels", label: "Channels" },
  { value: "file_size_bytes", label: "File Size" },
  { value: "created_at", label: "Date Added" },
];

export default function SortDropdown({ sortBy, sortOrder, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortBy) ?? { value: "filename" as const, label: "Filename" };

  const handleOptionClick = (value: SearchFilters["sortBy"]) => {
    if (value === sortBy) {
      // Toggle order if clicking same field
      onSortChange(value, sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New field, default to asc
      onSortChange(value, "asc");
    }
    setIsOpen(false);
  };

  const toggleOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <div className="sort-dropdown" ref={dropdownRef}>
      <button
        className="sort-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={`Sort by ${currentOption.label} (${sortOrder === "asc" ? "ascending" : "descending"})`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 16 4 4 4-4" />
          <path d="M7 20V4" />
          <path d="m21 8-4-4-4 4" />
          <path d="M17 4v16" />
        </svg>
        <span className="sort-label">{currentOption.label}</span>
        <button
          className={`sort-order-btn ${sortOrder}`}
          onClick={toggleOrder}
          title={sortOrder === "asc" ? "Ascending - click to reverse" : "Descending - click to reverse"}
        >
          {sortOrder === "asc" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </button>
      </button>

      {isOpen && (
        <div className="sort-dropdown-menu">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`sort-dropdown-item ${option.value === sortBy ? "active" : ""}`}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
              {option.value === sortBy && (
                <span className="sort-indicator">
                  {sortOrder === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
