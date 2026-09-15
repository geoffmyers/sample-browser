"use client";

import { useState, useRef, useEffect } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  maxDisplay = 2,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(filteredOptions.map((o) => o.value));
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplay) {
      return selected
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .join(", ");
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="multi-select" ref={containerRef}>
      <button
        type="button"
        className={`multi-select-trigger ${isOpen ? "open" : ""} ${selected.length > 0 ? "has-value" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        <span className="multi-select-value">{getDisplayText()}</span>
        <div className="multi-select-actions">
          {selected.length > 0 && (
            <span
              className="multi-select-clear"
              onClick={clearAll}
              title="Clear all"
            >
              ×
            </span>
          )}
          <span className="multi-select-arrow">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points={isOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
            </svg>
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="multi-select-dropdown">
          <div className="multi-select-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="multi-select-header">
            <button type="button" onClick={selectAll} className="multi-select-action-btn">
              Select All
            </button>
            <button type="button" onClick={clearAll} className="multi-select-action-btn">
              Clear
            </button>
          </div>

          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-empty">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.value}
                  className={`multi-select-option ${selected.includes(option.value) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                  />
                  <span className="option-label">{option.label}</span>
                  {option.count !== undefined && (
                    <span className="option-count">({option.count})</span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
