import { SECOND_MS, MINUTE_MS } from './time';

// -----------------------------------------------------------------------------
// Profile-feature constants
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Pagination & Limits
// -----------------------------------------------------------------------------
export const PAGE_LIMIT_DEFAULT = 20 as const;         // default post/feed page size
export const PROFILE_RETRY_LIMIT = 3 as const;         // max retry attempts

// -----------------------------------------------------------------------------
// React-Query timings
// -----------------------------------------------------------------------------
export const PROFILE_STALE_MS       = 5 * MINUTE_MS;   // profile query
export const PROFILE_GC_MS          = 10 * MINUTE_MS;

export const METRICS_STALE_MS       = 2 * MINUTE_MS;
export const METRICS_GC_MS          = 5 * MINUTE_MS;

export const FOLLOW_STATUS_STALE_MS = 30 * SECOND_MS;
export const FOLLOW_STATUS_GC_MS    = 2 * MINUTE_MS;

export const POSTS_STALE_MS         = 2 * MINUTE_MS;
export const POSTS_GC_MS            = 5 * MINUTE_MS;

export const SOCIAL_FEED_STALE_MS   = 30 * SECOND_MS;
export const SOCIAL_FEED_GC_MS      = 2 * MINUTE_MS;
export const SOCIAL_FEED_REFRESH_MS = 30 * SECOND_MS;  // only for “activity” feed

// -----------------------------------------------------------------------------
// Utility helpers (re-exported for convenience)
// -----------------------------------------------------------------------------
export { minutes, seconds } from './time';
export const RETRY_LIMIT_SHORT = 1 as const;

