"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const STORAGE_KEY = "sampleBrowser_favorites";

interface FavoritesContextType {
  favorites: Set<number>;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => void;
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  clearFavorites: () => void;
  favoritesCount: number;
  exportFavorites: () => number[];
  importFavorites: (ids: number[]) => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as number[];
        setFavorites(new Set(ids));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save favorites to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    }
  }, [favorites, isLoaded]);

  const isFavorite = useCallback(
    (id: number) => favorites.has(id),
    [favorites]
  );

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const addFavorite = useCallback((id: number) => {
    setFavorites((prev) => new Set(prev).add(id));
  }, []);

  const removeFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
  }, []);

  const exportFavorites = useCallback(() => {
    return [...favorites];
  }, [favorites]);

  const importFavorites = useCallback((ids: number[]) => {
    setFavorites(new Set(ids));
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites,
        favoritesCount: favorites.size,
        exportFavorites,
        importFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
