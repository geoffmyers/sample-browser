"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  minValue: number | null;
  maxValue: number | null;
  onChange: (min: number | null, max: number | null) => void;
  formatValue?: (value: number) => string;
  label?: string;
}

export default function RangeSlider({
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  onChange,
  formatValue = (v) => v.toString(),
  label,
}: RangeSliderProps) {
  const [localMin, setLocalMin] = useState(minValue ?? min);
  const [localMax, setLocalMax] = useState(maxValue ?? max);
  const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sync local state with props
  useEffect(() => {
    setLocalMin(minValue ?? min);
    setLocalMax(maxValue ?? max);
  }, [minValue, maxValue, min, max]);

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const rawValue = (percentage / 100) * (max - min) + min;
      return Math.round(rawValue / step) * step;
    },
    [min, max, step]
  );

  const handleMouseDown = (thumb: "min" | "max") => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const value = getValueFromPosition(e.clientX);

      if (isDragging === "min") {
        const newMin = Math.min(value, localMax - step);
        setLocalMin(Math.max(min, newMin));
      } else {
        const newMax = Math.max(value, localMin + step);
        setLocalMax(Math.min(max, newMax));
      }
    },
    [isDragging, localMin, localMax, min, max, step, getValueFromPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Only emit changes if they differ from the full range
      const emitMin = localMin > min ? localMin : null;
      const emitMax = localMax < max ? localMax : null;
      onChange(emitMin, emitMax);
    }
    setIsDragging(null);
  }, [isDragging, localMin, localMax, min, max, onChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleInputChange = (type: "min" | "max", value: string) => {
    const num = value === "" ? (type === "min" ? min : max) : parseInt(value, 10);
    if (isNaN(num)) return;

    if (type === "min") {
      const newMin = Math.max(min, Math.min(num, localMax - step));
      setLocalMin(newMin);
      onChange(newMin > min ? newMin : null, maxValue);
    } else {
      const newMax = Math.min(max, Math.max(num, localMin + step));
      setLocalMax(newMax);
      onChange(minValue, newMax < max ? newMax : null);
    }
  };

  const handleReset = () => {
    setLocalMin(min);
    setLocalMax(max);
    onChange(null, null);
  };

  const minPercent = getPercentage(localMin);
  const maxPercent = getPercentage(localMax);

  return (
    <div className="range-slider-component">
      {label && (
        <div className="range-slider-header">
          <span className="range-slider-label">{label}</span>
          {(minValue !== null || maxValue !== null) && (
            <button className="range-slider-reset" onClick={handleReset} type="button">
              Reset
            </button>
          )}
        </div>
      )}

      <div className="range-slider-track-container" ref={trackRef}>
        <div className="range-slider-track">
          <div
            className="range-slider-fill"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
            }}
          />
        </div>

        <div
          className={`range-slider-thumb range-slider-thumb-min ${isDragging === "min" ? "active" : ""}`}
          style={{ left: `${minPercent}%` }}
          onMouseDown={handleMouseDown("min")}
        />

        <div
          className={`range-slider-thumb range-slider-thumb-max ${isDragging === "max" ? "active" : ""}`}
          style={{ left: `${maxPercent}%` }}
          onMouseDown={handleMouseDown("max")}
        />
      </div>

      <div className="range-slider-values">
        <div className="range-slider-input-group">
          <input
            type="number"
            min={min}
            max={localMax - step}
            step={step}
            value={localMin}
            onChange={(e) => handleInputChange("min", e.target.value)}
          />
          <span className="range-slider-value-label">{formatValue(localMin)}</span>
        </div>
        <span className="range-slider-separator">to</span>
        <div className="range-slider-input-group">
          <input
            type="number"
            min={localMin + step}
            max={max}
            step={step}
            value={localMax}
            onChange={(e) => handleInputChange("max", e.target.value)}
          />
          <span className="range-slider-value-label">{formatValue(localMax)}</span>
        </div>
      </div>
    </div>
  );
}
