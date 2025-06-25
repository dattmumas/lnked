import { MINUTE_MS } from './time';

// ---------------------------------------------------------------------------
// Post-editor-specific constants
// ---------------------------------------------------------------------------

/** Debounce interval before triggering auto-save (500 ms) */
export const AUTO_SAVE_DEBOUNCE_MS = 500 as const;

/** React-Query cache staleness period for post data (5 minutes) */
export const POST_STALE_TIME_MS = 5 * MINUTE_MS;