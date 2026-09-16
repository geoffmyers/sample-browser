/**
 * Error handling utilities for consistent error message extraction
 */

/**
 * Extract a user-friendly error message from any error type
 * @param error - The error to extract a message from (unknown type)
 * @param defaultMessage - Fallback message if no message can be extracted
 * @returns A string error message suitable for display to users
 */
export function getErrorMessage(error: unknown, defaultMessage = "An unexpected error occurred"): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return defaultMessage;
}

/**
 * Check if an error is an AbortError (user-initiated cancellation)
 * @param error - The error to check
 * @returns true if this is an abort error that can be safely ignored
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Check if an error is a network error (connection failed)
 * @param error - The error to check
 * @returns true if this appears to be a network connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    error.name === "TypeError" // fetch throws TypeError on network failure
  );
}

/**
 * Log an error with context, filtering out expected errors
 * @param error - The error to log
 * @param context - Description of where the error occurred
 */
export function logError(error: unknown, context: string): void {
  // Don't log abort errors (user-initiated cancellations)
  if (isAbortError(error)) return;

  console.error(`Error in ${context}:`, error);
}
