"use client";

import { Fragment } from "react";

interface DirectoryPathProps {
  path: string | null;
  className?: string;
}

/**
 * Renders a directory path with right arrow icons instead of forward slashes
 * for better readability.
 */
export default function DirectoryPath({ path, className }: DirectoryPathProps) {
  if (!path || path === ".") {
    return <span className={className}>Root</span>;
  }

  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return <span className={className}>Root</span>;
  }

  return (
    <span className={`directory-path ${className || ""}`}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="path-separator" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          )}
          <span className="path-segment">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}
