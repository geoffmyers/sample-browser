"use client";

import { useState, useRef, useCallback } from "react";
import { uploadFiles, type UploadResponse } from "../lib/api/client";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [directory, setDirectory] = useState("uploads");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);
    setUploadResult(null);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setUploadResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadFiles(selectedFiles, directory);
      setUploadResult(result);

      if (result.uploaded > 0) {
        onUploadComplete();
      }

      // Clear files on successful upload
      if (result.errors === 0) {
        setSelectedFiles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([]);
      setUploadResult(null);
      setError(null);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Audio Files</h2>
          <button className="modal-close" onClick={handleClose} disabled={isUploading}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Drop Zone */}
          <div
            className={`upload-dropzone ${isDragOver ? "drag-over" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".wav,.mp3,.aif,.aiff,.flac,.ogg,.m4a,.wma,.caf"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: "none" }}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <p>Drag and drop audio files here</p>
            <span>or click to browse</span>
          </div>

          {/* Target Directory */}
          <div className="upload-directory">
            <label htmlFor="directory">Upload to directory:</label>
            <input
              id="directory"
              type="text"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder="uploads"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="upload-files">
              <div className="upload-files-header">
                <span>{selectedFiles.length} file(s) selected</span>
                <button className="btn btn-secondary" onClick={clearFiles}>
                  Clear All
                </button>
              </div>
              <ul className="upload-file-list">
                {selectedFiles.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                    <span className="filename">{file.name}</span>
                    <span className="filesize">{formatFileSize(file.size)}</span>
                    <button
                      className="remove-btn"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`upload-result ${uploadResult.errors > 0 ? "has-errors" : "success"}`}>
              <p>
                Uploaded {uploadResult.uploaded} of {uploadResult.uploaded + uploadResult.errors} files
              </p>
              {uploadResult.error_details && uploadResult.error_details.length > 0 && (
                <ul className="error-list">
                  {uploadResult.error_details.map((err) => (
                    <li key={err.filename}>
                      <strong>{err.filename}:</strong> {err.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Error */}
          {error && <div className="upload-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
