'use client';

// Constants for time calculations
const MILLISECONDS_TO_SECONDS = 1000;
const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const SECONDS_IN_MONTH = 2592000;

/**
 * Formats a date string into a relative time string (e.g., "5m ago").
 * Falls back to a localized date string for older dates.
 * @param dateString - The ISO date string to format.
 * @returns A formatted, human-readable date string.
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) {
    return 'Never';
  }

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - date.getTime()) / MILLISECONDS_TO_SECONDS,
    );

    if (diffInSeconds < SECONDS_IN_MINUTE) return 'Just now';
    if (diffInSeconds < SECONDS_IN_HOUR)
      return `${Math.floor(diffInSeconds / SECONDS_IN_MINUTE)}m ago`;
    if (diffInSeconds < SECONDS_IN_DAY)
      return `${Math.floor(diffInSeconds / SECONDS_IN_HOUR)}h ago`;
    if (diffInSeconds < SECONDS_IN_MONTH)
      return `${Math.floor(diffInSeconds / SECONDS_IN_DAY)}d ago`;

    return date.toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}
