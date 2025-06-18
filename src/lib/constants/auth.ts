// Authentication constants
export const AUTH_CONSTANTS = {
  // Rate limiting
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 60_000, // 60 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1_000, // 1 second
  BACKOFF_MULTIPLIER: 2,
  MAX_JITTER_MS: 1_000, // 1 second max jitter
  
  // Time conversion
  MS_PER_MINUTE: 60_000
} as const; 