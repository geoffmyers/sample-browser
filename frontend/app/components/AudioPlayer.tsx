"use client";

import { useState, useRef, useEffect, memo } from "react";
import { getAudioUrl } from "../lib/api/client";
import { useSettings } from "../lib/context/SettingsContext";
import { useAudio } from "../lib/context/AudioContext";
import Waveform from "./Waveform";

interface AudioPlayerProps {
  sampleId: number;
  duration: number | null;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  // Handle invalid values (Infinity, NaN, negative)
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AudioPlayer({ sampleId, duration, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { settings } = useSettings();
  const { registerAudio, unregisterAudio, playAudio, pauseAudio } = useAudio();

  const audioUrl = getAudioUrl(sampleId);

  // Register audio element with global context
  useEffect(() => {
    if (audioRef.current) {
      registerAudio(sampleId, audioRef.current);
    }
    return () => {
      unregisterAudio(sampleId);
    };
  }, [sampleId, registerAudio, unregisterAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.audioVolume;
    }
  }, [settings.audioVolume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = settings.loopAudio;
    }
  }, [settings.loopAudio]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasInteracted(true);
    if (isPlaying) {
      pauseAudio(sampleId);
    } else {
      playAudio(sampleId);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const browserDuration = audioRef.current.duration;
      // For streaming/transcoded content, browser may return Infinity
      // Use the pre-computed duration from database in that case
      if (Number.isFinite(browserDuration) && browserDuration > 0) {
        setAudioDuration(browserDuration);
      } else if (duration && duration > 0) {
        // Fall back to database duration for transcoded streams
        setAudioDuration(duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const progressPercent =
    audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Compact mode for table view - just play button
  if (compact) {
    return (
      <div className="audio-player-compact" onClick={(e) => e.stopPropagation()}>
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="none"
        />
        <button className="play-button-compact" onClick={handlePlayPause}>
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="audio-player" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="none"
      />

      <button className="play-button" onClick={handlePlayPause}>
        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="audio-progress">
        <Waveform
          audioUrl={audioUrl}
          progress={progressPercent}
          height={32}
          loadOnDemand={true}
          shouldLoad={hasInteracted}
        />
      </div>

      <span className="audio-time">
        {formatTime(currentTime)}/{formatTime(audioDuration)}
      </span>
    </div>
  );
}

// Memoize to prevent re-renders when parent changes but props don't
export default memo(AudioPlayer, (prevProps, nextProps) => {
  return (
    prevProps.sampleId === nextProps.sampleId &&
    prevProps.duration === nextProps.duration &&
    prevProps.compact === nextProps.compact
  );
});
