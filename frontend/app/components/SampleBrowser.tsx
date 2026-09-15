"use client";

import { useState, useEffect, useCallback } from "react";
import type { Sample, ScanStatus } from "../lib/types/sample";
import type { SearchFilters } from "../lib/types/search";
import { listSamples, getScanStatus, triggerScan } from "../lib/api/client";
import { useSettings } from "../lib/context/SettingsContext";
import { useBrowserState } from "../lib/context/BrowserStateContext";
import { getErrorMessage } from "../lib/utils/errors";

import { useFavorites } from "../lib/context/FavoritesContext";
import SearchBar from "./SearchBar";
import FilterPanel from "./FilterPanel";
import SampleCard from "./SampleCard";
import SampleTable from "./SampleTable";
import Pagination from "./Pagination";
import UploadModal from "./UploadModal";
import SettingsModal from "./SettingsModal";
import SortDropdown from "./SortDropdown";

export default function SampleBrowser() {
  const { settings, updateSettings, isHydrated: settingsHydrated } = useSettings();
  const { filters, page, updateFilters, setPage, isHydrated: browserStateHydrated } = useBrowserState();
  const { favorites } = useFavorites();

  // Combined hydration check - both contexts must be ready
  const isHydrated = settingsHydrated && browserStateHydrated;

  // State (non-persisted)
  const [samples, setSamples] = useState<Sample[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Fetch samples - only depends on favorites when favoritesOnly filter is active
  // This prevents unnecessary refetches when toggling favorites
  const fetchSamples = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Pass favorite IDs to backend when filtering by favorites
      const favoriteIds = filters.favoritesOnly ? Array.from(favorites) : undefined;
      const response = await listSamples(page, settings.itemsPerPage, filters, favoriteIds);
      setSamples(response.items);
      setTotal(response.total);
      setPages(response.pages);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load samples"));
      setSamples([]);
    } finally {
      setIsLoading(false);
    }
    // Only include favorites in deps when filtering by favorites to avoid re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters, settings.itemsPerPage, filters.favoritesOnly ? favorites : null]);

  // Fetch samples on mount and when filters change
  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  // Fetch scan status periodically when scanning
  useEffect(() => {
    const checkScanStatus = async () => {
      try {
        const status = await getScanStatus();
        setScanStatus(status);

        // Refresh samples when scan completes
        if (status.status === "complete" && scanStatus?.status === "scanning") {
          fetchSamples();
        }
      } catch (err) {
        console.error("Failed to get scan status:", err);
      }
    };

    checkScanStatus();

    // Poll while scanning
    const interval = setInterval(() => {
      if (scanStatus?.status === "scanning") {
        checkScanStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [scanStatus?.status, fetchSamples]);

  // Handlers
  const handleFilterChange = (updates: Partial<SearchFilters>) => {
    updateFilters(updates); // This also resets page to 1
  };

  const handleSearchChange = (q: string) => {
    handleFilterChange({ q });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRescan = async () => {
    try {
      await triggerScan();
      const status = await getScanStatus();
      setScanStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    }
  };

  const handleSortChange = (sortBy: SearchFilters["sortBy"], sortOrder: SearchFilters["sortOrder"]) => {
    handleFilterChange({ sortBy, sortOrder });
  };

  // Handle column header click in table view - toggles sort order if same field, otherwise sets to asc
  const handleTableSort = (field: SearchFilters["sortBy"]) => {
    if (field === filters.sortBy) {
      // Toggle order if clicking the same column
      handleFilterChange({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" });
    } else {
      // New column: set to ascending
      handleFilterChange({ sortBy: field, sortOrder: "asc" });
    }
  };

  const toggleFilters = () => {
    updateSettings({ showFilters: !settings.showFilters });
  };

  const toggleTheme = () => {
    updateSettings({
      colorTheme: settings.colorTheme === "dark" ? "light" : "dark",
    });
  };

  const toggleLoop = () => {
    updateSettings({ loopAudio: !settings.loopAudio });
  };

  const cycleViewMode = () => {
    const modes: Array<"grid" | "list" | "table"> = ["grid", "list", "table"];
    const currentIndex = modes.indexOf(settings.viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    updateSettings({ viewMode: modes[nextIndex] });
  };

  const getViewModeIcon = () => {
    if (settings.viewMode === "grid") {
      // Show list icon (next mode)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" x2="21" y1="6" y2="6" />
          <line x1="3" x2="21" y1="12" y2="12" />
          <line x1="3" x2="21" y1="18" y2="18" />
        </svg>
      );
    } else if (settings.viewMode === "list") {
      // Show table icon (next mode)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v18" />
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
        </svg>
      );
    } else {
      // Show grid icon (next mode)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      );
    }
  };

  const getNextViewModeName = () => {
    if (settings.viewMode === "grid") return "list";
    if (settings.viewMode === "list") return "table";
    return "grid";
  };

  // Show loading skeleton during SSR/hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <h1>Sample Browser</h1>
            <div className="header-actions" />
          </div>
        </header>
        <main className="main-content">
          <div className="sample-grid-container">
            <div className="loading">
              <div className="loading-spinner" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>Sample Browser</h1>

          <SearchBar
            value={filters.q}
            onChange={handleSearchChange}
            placeholder="Search samples..."
          />

          <div className="header-actions">
            {/* Scan Status */}
            {scanStatus && (
              <span
                className={`status-badge ${scanStatus.status === "scanning" ? "scanning" : "healthy"}`}
              >
                {scanStatus.status === "scanning"
                  ? `Scanning... ${Math.round(scanStatus.progressPercent || 0)}%`
                  : `${total} samples`}
              </span>
            )}

            {/* Sort Dropdown */}
            <SortDropdown
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortChange={handleSortChange}
            />

            {/* Upload Button */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => setShowUploadModal(true)}
              title="Upload audio files"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </button>

            {/* Loop Toggle Button */}
            <button
              className={`btn btn-secondary btn-icon ${settings.loopAudio ? "active" : ""}`}
              onClick={toggleLoop}
              title={settings.loopAudio ? "Loop playback enabled" : "Loop playback disabled"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                <path d="m7 22-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
            </button>

            {/* Rescan Button */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={handleRescan}
              disabled={scanStatus?.status === "scanning"}
              title="Rescan audio directory"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            </button>

            {/* Toggle Filters */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={toggleFilters}
              title="Toggle filters"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>

            {/* View Mode Toggle */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={cycleViewMode}
              title={`Switch to ${getNextViewModeName()} view`}
            >
              {getViewModeIcon()}
            </button>

            {/* Theme Toggle */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={toggleTheme}
              title={`Switch to ${settings.colorTheme === "dark" ? "light" : "dark"} mode`}
            >
              {settings.colorTheme === "dark" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>

            {/* Settings Button */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          visible={settings.showFilters}
        />

        <div className="sample-grid-container">
          {/* Error State */}
          {error && (
            <div className="empty-state">
              <h2>Error</h2>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchSamples}>
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !error && (
            <div className="loading">
              <div className="loading-spinner" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && samples.length === 0 && (
            <div className="empty-state">
              <h2>No samples found</h2>
              <p>
                {filters.q || Object.values(filters).some((v) => v !== null && v !== "")
                  ? "Try adjusting your search or filters"
                  : "No audio samples have been indexed yet"}
              </p>
              {!filters.q && (
                <button className="btn btn-primary" onClick={handleRescan}>
                  Scan for Samples
                </button>
              )}
            </div>
          )}

          {/* Sample Grid/List/Table */}
          {!isLoading && !error && samples.length > 0 && (
            <>
              {settings.viewMode === "table" ? (
                <SampleTable
                  samples={samples}
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onSort={handleTableSort}
                />
              ) : (
                <div
                  className={
                    settings.viewMode === "grid" ? "sample-grid" : "sample-list"
                  }
                >
                  {samples.map((sample) => (
                    <SampleCard
                      key={sample.id}
                      sample={sample}
                      viewMode={settings.viewMode === "grid" ? "grid" : "list"}
                    />
                  ))}
                </div>
              )}

              <Pagination
                page={page}
                pages={pages}
                total={total}
                perPage={settings.itemsPerPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          // Trigger rescan after upload
          handleRescan();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
