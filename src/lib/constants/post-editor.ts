// ---------------------------------------------------------------------------
// Post-editor-specific constants
// ---------------------------------------------------------------------------

/** Base time units */
export const MILLISECOND = 1 as const;
export const SECOND_MS = 1000 * MILLISECOND; // 1 second
export const MINUTE_MS = 60 * SECOND_MS; // 1 minute

/** Debounce interval before triggering auto-save (500 ms) */
export const AUTO_SAVE_DEBOUNCE_MS = 500 as const;

/** React-Query cache staleness period for post data (5 minutes) */
export const POST_STALE_TIME_MS = 5 * MINUTE_MS;