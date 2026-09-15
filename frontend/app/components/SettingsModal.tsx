"use client";

import { useRef, useState } from "react";
import { useSettings, ALL_METADATA_FIELDS, FIELD_LABELS, type MetadataField, type BrowserSettings } from "../lib/context/SettingsContext";
import { useFavorites } from "../lib/context/FavoritesContext";

interface BackupData {
  version: number;
  exportedAt: string;
  settings: BrowserSettings;
  favorites: number[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettings();
  const { exportFavorites, importFavorites, favoritesCount } = useFavorites();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const toggleField = (field: MetadataField) => {
    const currentFields = settings.visibleFields;
    if (currentFields.includes(field)) {
      updateSettings({ visibleFields: currentFields.filter((f) => f !== field) });
    } else {
      updateSettings({ visibleFields: [...currentFields, field] });
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ itemsPerPage: parseInt(e.target.value, 10) });
  };

  const handleExportBackup = () => {
    const backupData: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: exportSettings(),
      favorites: exportFavorites(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sample-browser-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;

        if (!data.version || !data.settings || !data.favorites) {
          throw new Error("Invalid backup file format");
        }

        importSettings(data.settings);
        importFavorites(data.favorites);

        setImportMessage({
          type: "success",
          text: `Imported ${data.favorites.length} favorites and settings from ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : "backup"}`,
        });
      } catch {
        setImportMessage({
          type: "error",
          text: "Failed to import backup. Please check the file format.",
        });
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Visible Fields */}
          <div className="settings-section">
            <h3>Visible Metadata Fields</h3>
            <p className="settings-hint">Choose which fields to display in all views (grid, list, and table)</p>
            <div className="field-toggles">
              {ALL_METADATA_FIELDS.map((field) => (
                <label key={field} className="field-toggle">
                  <input
                    type="checkbox"
                    checked={settings.visibleFields.includes(field)}
                    onChange={() => toggleField(field)}
                  />
                  <span className="toggle-label">{FIELD_LABELS[field]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Items Per Page */}
          <div className="settings-section">
            <h3>Items Per Page</h3>
            <select
              value={settings.itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="settings-select"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* Reset */}
          <div className="settings-section">
            <button className="btn btn-secondary" onClick={resetSettings}>
              Reset to Defaults
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="settings-section">
            <h3>Backup & Restore</h3>
            <p className="settings-hint">
              Export your favorites ({favoritesCount}) and settings to a file, or restore from a backup.
            </p>

            <div className="backup-buttons">
              <button className="btn btn-primary" onClick={handleExportBackup}>
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Export Backup
              </button>

              <label className="btn btn-secondary import-btn">
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                Import Backup
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {importMessage && (
              <div className={`import-message ${importMessage.type}`}>
                {importMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
