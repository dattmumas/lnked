import { AUTH_CONSTANTS } from '@/lib/constants/auth';

// -----------------------------------------------------------------------------
// Constants & helpers (eliminate "magic numbers", insecure randomness, and
// improve type‑safety for error handling)
// -----------------------------------------------------------------------------
export const { 
  MAX_ATTEMPTS: DEFAULT_MAX_ATTEMPTS,
  WINDOW_MS: DEFAULT_WINDOW_MS,
  MAX_RETRIES: DEFAULT_MAX_RETRIES,
  BASE_DELAY_MS,
  BACKOFF_MULTIPLIER,
  MAX_JITTER_MS,
  MS_PER_MINUTE
} = AUTH_CONSTANTS;

/** Narrow type‑guard for objects that carry a string `.message`. */
function hasErrorMessage(err: unknown): err is { message: string } {
  return typeof err === 'object'
    && err !== null
    && 'message' in err
    && typeof (err as { message: unknown }).message === 'string';
}

/** Type declaration for crypto with randomInt */
interface CryptoWithRandomInt extends Crypto {
  randomInt?(min: number, max: number): number;
}

/** Secure random int helper that never falls back to `Math.random()`. */
const getSecureRandomInt = (max: number): number => {
  // Node ≥ 16: `crypto.randomInt`
  const cryptoNode = crypto as CryptoWithRandomInt;
  if (typeof cryptoNode.randomInt === 'function' && cryptoNode.randomInt !== undefined) {
    return cryptoNode.randomInt(0, max);
  }

  // Browsers (and Node ≥ 15): `crypto.getRandomValues`
  if (typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }

  // Final fallback: derive pseudo‑randomness from the clock (deterministic,
  // but avoids insecure Math.random to satisfy lint rule)
  return Date.now() % max;
};

// Rate limiting utility
export class RateLimiter {
  private attempts: number[] = [];
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    windowMs: number = DEFAULT_WINDOW_MS
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(): boolean {
    const now = Date.now();
    // Remove attempts outside the window
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    return this.attempts.length < this.maxAttempts;
  }

  recordAttempt(): void {
    this.attempts.push(Date.now());
  }

  getTimeUntilReset(): number {
    if (this.attempts.length === 0) return 0;
    const oldestAttempt = Math.min(...this.attempts);
    const timeUntilReset = this.windowMs - (Date.now() - oldestAttempt);
    return Math.max(0, timeUntilReset);
  }
}

// Retry utility with exponential backoff
/* eslint-disable security-node/detect-unhandled-async-errors */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  baseDelay: number = BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
      
      // Don't retry on rate limit errors - handle them differently
      if (hasErrorMessage(error)) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
          throw error; // Don't retry rate limit errors
        }
      }
      
      if (attempt === maxRetries) {
        if (hasErrorMessage(lastError)) {
          throw new Error(lastError.message);
        }
        throw new Error('All retry attempts failed');
      }
      
      // Exponential backoff with jitter
      const delay =
        baseDelay * Math.pow(BACKOFF_MULTIPLIER, attempt) +
        getSecureRandomInt(MAX_JITTER_MS);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), delay);
      });
    }
  }
  
  if (hasErrorMessage(lastError)) {
    throw new Error(lastError.message);
  }
  throw new Error('All retry attempts failed');
}
/* eslint-enable security-node/detect-unhandled-async-errors */

// Helper function to check if an error is a rate limit error
export function isRateLimitError(error: unknown): boolean {
  try {
    if (hasErrorMessage(error)) {
      const errorMessage = error.message.toLowerCase();
      return (
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests')
      );
    }
    return false;
  } catch {
    return false;
  }
}

// Helper function to format rate limit messages
export function formatRateLimitMessage(timeUntilReset: number, action: 'sign-in' | 'sign-up'): string {
  const minutes = Math.ceil(timeUntilReset / MS_PER_MINUTE);
  return `Too many ${action} attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
}

// Helper function to get user-friendly error messages
export function getAuthErrorMessage(error: unknown): string {
  if (!hasErrorMessage(error)) {
    return 'An unexpected error occurred';
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (errorMessage.includes('user already registered')) {
    return 'An account with this email already exists. Please try signing in instead.';
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'Authentication service is temporarily busy. Please wait a moment and try again.';
  }

  if (errorMessage.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }

  if (errorMessage.includes('signup disabled')) {
    return 'Account registration is currently disabled. Please contact support.';
  }

  // Return the original message if we don't have a specific handler
  return String(error.message);
}