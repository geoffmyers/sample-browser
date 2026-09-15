"use client";

import { useState, useEffect } from "react";
import { getDirectoryImageUrl } from "../lib/api/client";

interface DirectoryImageProps {
  directory: string | null;
  className?: string;
  size?: number;
}

/**
 * Displays cover art or thumbnail image for a sample's directory.
 * Shows a placeholder icon if no image is found.
 */
export default function DirectoryImage({
  directory,
  className = "",
  size = 48,
}: DirectoryImageProps) {
  const [hasImage, setHasImage] = useState<boolean | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!directory) {
      setHasImage(false);
      return;
    }

    // Generate the image URL
    const url = getDirectoryImageUrl(directory);
    setImageUrl(url);

    // Check if image exists
    const img = new Image();
    img.onload = () => setHasImage(true);
    img.onerror = () => setHasImage(false);
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [directory]);

  // Loading state
  if (hasImage === null) {
    return (
      <div
        className={`directory-image directory-image-placeholder ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // No image found
  if (!hasImage || !imageUrl) {
    return null;
  }

  return (
    <div
      className={`directory-image ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        onError={() => setHasImage(false)}
      />
    </div>
  );
}
