"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface WaveformProps {
  audioUrl: string;
  progress: number; // 0-100
  height?: number;
  barWidth?: number;
  barGap?: number;
  loadOnDemand?: boolean; // If true, only load when triggered
  shouldLoad?: boolean; // External trigger to start loading
}

export default function Waveform({
  audioUrl,
  progress,
  height = 40,
  barWidth = 2,
  barGap = 1,
  loadOnDemand = true,
  shouldLoad = false,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const analyzeAudio = useCallback(async () => {
    if (hasAttemptedLoad || isLoading || !audioUrl) return;

    setHasAttemptedLoad(true);
    setIsLoading(true);
    setError(false);

    let audioContext: AudioContext | null = null;

    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error("Failed to fetch audio");

      const arrayBuffer = await response.arrayBuffer();

      // Try to decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get raw audio data from the first channel
      const rawData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of bars to display
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        let sum = 0;

        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }

        filteredData.push(sum / blockSize);
      }

      // Normalize the data
      const maxValue = Math.max(...filteredData);
      const normalizedData = filteredData.map((val) =>
        maxValue > 0 ? val / maxValue : 0
      );

      setWaveformData(normalizedData);
    } catch {
      // Silently fail - don't log to console to avoid spam
      // Some audio formats (CAF with AAC codec) can't be decoded by Web Audio API
      setError(true);
    } finally {
      setIsLoading(false);
      if (audioContext) {
        try {
          audioContext.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }, [audioUrl, hasAttemptedLoad, isLoading]);

  // Load immediately if not on-demand, or when shouldLoad becomes true
  useEffect(() => {
    if (!loadOnDemand || shouldLoad) {
      analyzeAudio();
    }
  }, [loadOnDemand, shouldLoad, analyzeAudio]);

  // Reset state when audio URL changes
  useEffect(() => {
    setWaveformData([]);
    setError(false);
    setHasAttemptedLoad(false);
  }, [audioUrl]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    const totalBars = waveformData.length;
    const totalWidth = totalBars * (barWidth + barGap) - barGap;
    const startX = (width - totalWidth) / 2;

    // Calculate progress position
    const progressX = (progress / 100) * totalWidth + startX;

    waveformData.forEach((value, index) => {
      const x = startX + index * (barWidth + barGap);
      const barHeight = Math.max(2, value * (canvasHeight - 4));
      const y = (canvasHeight - barHeight) / 2;

      // Color based on progress
      if (x + barWidth < progressX) {
        // Played portion - gradient
        ctx.fillStyle = "#60a5fa";
      } else {
        // Unplayed portion
        ctx.fillStyle = "#64748b";
      }

      // Draw bar with rounded corners
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    });
  }, [waveformData, progress, height, barWidth, barGap]);

  if (error) {
    // Show simple fallback progress bar on error
    return (
      <div className="waveform-fallback" style={{ height }}>
        <div
          className="waveform-fallback-progress"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  // Show placeholder until loaded
  if (!hasAttemptedLoad || isLoading || waveformData.length === 0) {
    return (
      <div className="waveform-fallback" style={{ height }}>
        <div
          className="waveform-fallback-progress"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      style={{ width: "100%", height }}
    />
  );
}
