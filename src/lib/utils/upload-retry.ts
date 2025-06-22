/**
 * Upload Retry and Resilience Utilities
 * 
 * Provides robust retry mechanisms for video uploads with exponential backoff,
 * network error detection, and upload state management.
 */

// Constants for retry logic
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000; // 1 second
const DEFAULT_MAX_DELAY = 30000; // 30 seconds
const EXPONENTIAL_BASE = 2;
const JITTER_FACTOR = 0.1; // 10% jitter
const HALF_JITTER = 0.5;
const MILLISECONDS_PER_SECOND = 1000;

// Network error types that should trigger retries
const RETRYABLE_ERROR_CODES = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'TEMPORARY_FAILURE'
] as const;

// HTTP status codes that should trigger retries
const REQUEST_TIMEOUT = 408;
const TOO_MANY_REQUESTS = 429;
const INTERNAL_SERVER_ERROR = 500;
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;
const GATEWAY_TIMEOUT = 504;

const RETRYABLE_HTTP_STATUSES = [
  REQUEST_TIMEOUT, // Request Timeout
  TOO_MANY_REQUESTS, // Too Many Requests
  INTERNAL_SERVER_ERROR, // Internal Server Error
  BAD_GATEWAY, // Bad Gateway
  SERVICE_UNAVAILABLE, // Service Unavailable
  GATEWAY_TIMEOUT, // Gateway Timeout
] as const;

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  enableJitter?: boolean;
}

interface RetryableError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
  retryAfter?: number; // Seconds to wait (from Retry-After header)
}

interface RetryContext {
  attempt: number;
  maxRetries: number;
  lastError: RetryableError;
  totalElapsed: number;
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: unknown): error is RetryableError {
  if (!(error instanceof Error)) return false;
  
  const retryableError = error as RetryableError;
  
  // Explicit retryable flag
  if (retryableError.retryable === false) return false;
  if (retryableError.retryable === true) return true;
  
  // Check error codes
  if (retryableError.code && 
      (RETRYABLE_ERROR_CODES as readonly string[]).includes(retryableError.code)) {
    return true;
  }
  
  // Check HTTP status codes
  if (typeof retryableError.status === 'number' && 
      (RETRYABLE_HTTP_STATUSES as readonly number[]).includes(retryableError.status)) {
    return true;
  }
  
  // Check error messages for common network issues
  const message = error.message.toLowerCase();
  const networkErrorPatterns = [
    'network error',
    'fetch failed',
    'connection timeout',
    'request timeout',
    'socket timeout',
    'rate limit',
    'temporarily unavailable',
    'service unavailable'
  ];
  
  return networkErrorPatterns.some(pattern => message.includes(pattern));
}

/**
 * Calculates delay with exponential backoff and optional jitter
 */
export function calculateRetryDelay(
  attempt: number, 
  config: RetryConfig = {}
): number {
  const { 
    baseDelay = DEFAULT_BASE_DELAY, 
    maxDelay = DEFAULT_MAX_DELAY,
    enableJitter = true 
  } = config;
  
  // Exponential backoff: baseDelay * (2^attempt)
  const exponentialDelay = baseDelay * Math.pow(EXPONENTIAL_BASE, attempt - 1);
  
  // Apply maximum delay cap
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter to prevent thundering herd
  if (enableJitter) {
    const jitter = cappedDelay * JITTER_FACTOR * (Math.random() - HALF_JITTER);
    return Math.max(0, cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Generic retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {},
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  const { maxRetries = DEFAULT_MAX_RETRIES } = config;
  const startTime = Date.now();
  
  let lastError: RetryableError | undefined = undefined;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as RetryableError;
      
      // Don't retry on last attempt or non-retryable errors
      if (attempt > maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      const retryContext: RetryContext = {
        attempt,
        maxRetries,
        lastError,
        totalElapsed: Date.now() - startTime
      };
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(retryContext);
      }
      
      // Calculate delay (respect Retry-After header if present)
      let delay = calculateRetryDelay(attempt, config);
      if (lastError.retryAfter !== undefined) {
        delay = Math.max(delay, lastError.retryAfter * MILLISECONDS_PER_SECOND);
      }
      
      // Wait before retry
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), delay);
      });
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError ?? new Error('Unknown error occurred during retry attempts');
}

/**
 * Creates a retryable fetch wrapper with enhanced error handling
 */
export function createRetryableFetch(config: RetryConfig = {}): (url: string, options?: RequestInit) => Promise<Response> {
  return async function retryableFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    return withRetry(
      async () => {
        const response = await fetch(url, {
          ...options,
          signal: options.signal, // Preserve abort signal
        });
        
        // Convert HTTP errors to retryable errors
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as RetryableError;
          error.status = response.status;
          
          // Add Retry-After header if present
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            error.retryAfter = parseInt(retryAfter, 10);
          }
          
          throw error;
        }
        
        return response;
      },
      config,
      (context) => {
        console.warn('[retryable_fetch]', {
          url,
          attempt: context.attempt,
          max_retries: context.maxRetries,
          error: context.lastError.message,
          status: context.lastError.status,
          elapsed_ms: context.totalElapsed
        });
      }
    );
  };
}

/**
 * Upload-specific retry wrapper with progress preservation
 */
export function withUploadRetry<T>(
  uploadOperation: (onProgress?: (progress: number) => void) => Promise<T>,
  config: RetryConfig & { 
    onProgress?: (progress: number) => void;
    onRetryProgress?: (attempt: number, maxRetries: number) => void;
  } = {}
): Promise<T> {
  const { onProgress, onRetryProgress, ...retryConfig } = config;
  let lastProgress = 0;
  
  return withRetry(
    () => uploadOperation((progress) => {
      lastProgress = Math.max(lastProgress, progress); // Progress should never go backwards
      if (onProgress) {
        onProgress(lastProgress);
      }
    }),
    retryConfig,
    (context) => {
      console.warn('[upload_retry]', {
        attempt: context.attempt,
        max_retries: context.maxRetries,
        error: context.lastError.message,
        last_progress: lastProgress,
        elapsed_ms: context.totalElapsed
      });
      
      if (onRetryProgress) {
        onRetryProgress(context.attempt, context.maxRetries);
      }
    }
  );
}

/**
 * Enhanced upload state management with retry context
 */
export interface UploadState {
  status: 'idle' | 'uploading' | 'retrying' | 'processing' | 'complete' | 'failed';
  progress: number;
  retryAttempt?: number;
  maxRetries?: number;
  error?: string;
  isRetryable?: boolean;
}

/**
 * Creates an upload state manager with retry capabilities
 */
export function createUploadStateManager(
  initialState: Partial<UploadState> = {}
): {
  state: UploadState;
  updateState: (updates: Partial<UploadState>) => void;
  setRetrying: (attempt: number, maxRetries: number, error: string) => void;
  setFailed: (error: string, isRetryable: boolean) => void;
  reset: () => void;
} {
  let state: UploadState = {
    status: 'idle',
    progress: 0,
    ...initialState
  };
  
  const updateState = (updates: Partial<UploadState>): void => {
    state = { ...state, ...updates };
  };
  
  const setRetrying = (attempt: number, maxRetries: number, error: string): void => {
    updateState({
      status: 'retrying',
      retryAttempt: attempt,
      maxRetries,
      error,
      isRetryable: true
    });
  };
  
  const setFailed = (error: string, isRetryable: boolean): void => {
    updateState({
      status: 'failed',
      error,
      isRetryable
    });
  };
  
  const reset = (): void => {
    state = {
      status: 'idle',
      progress: 0
    };
  };
  
  return {
    get state() { return state; },
    updateState,
    setRetrying,
    setFailed,
    reset
  };
} 