"use client";

import { createContext, useContext, useRef, useCallback, useState, type ReactNode } from "react";

interface AudioContextType {
  currentlyPlaying: number | null;
  registerAudio: (sampleId: number, audioElement: HTMLAudioElement) => void;
  unregisterAudio: (sampleId: number) => void;
  playAudio: (sampleId: number) => void;
  pauseAudio: (sampleId: number) => void;
  stopAllAudio: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioElements = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  // Track pending play promises to avoid interruption errors
  const playPromises = useRef<Map<number, Promise<void>>>(new Map());

  const registerAudio = useCallback((sampleId: number, audioElement: HTMLAudioElement) => {
    audioElements.current.set(sampleId, audioElement);
  }, []);

  const unregisterAudio = useCallback((sampleId: number) => {
    audioElements.current.delete(sampleId);
    playPromises.current.delete(sampleId);
    setCurrentlyPlaying((prev) => (prev === sampleId ? null : prev));
  }, []);

  const stopAllAudio = useCallback(() => {
    audioElements.current.forEach((audio, id) => {
      // Only pause if there's no pending play promise
      const pendingPlay = playPromises.current.get(id);
      if (pendingPlay) {
        pendingPlay.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {
          // Ignore abort errors
        });
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    playPromises.current.clear();
    setCurrentlyPlaying(null);
  }, []);

  const playAudio = useCallback((sampleId: number) => {
    // Pause all other audio first, respecting pending play promises
    audioElements.current.forEach((audio, id) => {
      if (id !== sampleId) {
        const pendingPlay = playPromises.current.get(id);
        if (pendingPlay) {
          pendingPlay.then(() => {
            audio.pause();
            audio.currentTime = 0;
          }).catch(() => {
            // Ignore abort errors
          });
        } else {
          audio.pause();
          audio.currentTime = 0;
        }
        playPromises.current.delete(id);
      }
    });

    // Play the requested audio
    const audio = audioElements.current.get(sampleId);
    if (audio) {
      const playPromise = audio.play();
      playPromises.current.set(sampleId, playPromise);
      playPromise
        .then(() => {
          playPromises.current.delete(sampleId);
        })
        .catch((error) => {
          playPromises.current.delete(sampleId);
          // Only log errors that aren't abort errors (user intentionally interrupted)
          if (error.name !== "AbortError") {
            console.error("Audio playback error:", error);
          }
        });
      setCurrentlyPlaying(sampleId);
    }
  }, []);

  const pauseAudio = useCallback((sampleId: number) => {
    const audio = audioElements.current.get(sampleId);
    if (audio) {
      // Wait for any pending play promise before pausing
      const pendingPlay = playPromises.current.get(sampleId);
      if (pendingPlay) {
        pendingPlay.then(() => {
          audio.pause();
        }).catch(() => {
          // Ignore abort errors, still try to pause
          audio.pause();
        });
      } else {
        audio.pause();
      }
      playPromises.current.delete(sampleId);
    }
    setCurrentlyPlaying((prev) => (prev === sampleId ? null : prev));
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentlyPlaying,
        registerAudio,
        unregisterAudio,
        playAudio,
        pauseAudio,
        stopAllAudio,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
