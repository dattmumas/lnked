import { useCallback, useState } from 'react';

// Constants
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

interface ErrorState {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: number;
}

interface UseErrorWithRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: ErrorState) => void;
}

interface UseErrorWithRetryReturn {
  error: ErrorState | null;
  isRetrying: boolean;
  retryCount: number;
  setError: (error: string | Error | null, code?: string, details?: unknown) => void;
  clearError: () => void;
  retry: (retryFn: () => Promise<void> | void) => Promise<void>;
  canRetry: boolean;
}

export function useErrorWithRetry({
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelay = DEFAULT_RETRY_DELAY,
  onError,
}: UseErrorWithRetryOptions = {}): UseErrorWithRetryReturn {
  const [error, setErrorState] = useState<ErrorState | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const setError = useCallback((
    errorInput: string | Error | null,
    code?: string,
    details?: unknown
  ): void => {
    if (errorInput === null) {
      setErrorState(null);
      setRetryCount(0);
      return;
    }

    let message: string;
    let errorCode: string | undefined = code;
    
    if (typeof errorInput === 'string') {
      message = errorInput;
    } else if (errorInput instanceof Error) {
      const { message: errorMessage, name } = errorInput;
      message = errorMessage;
      errorCode = (code !== undefined && code !== null && code !== '') ? code : name;
    } else {
      message = 'An unknown error occurred';
    }

    const errorState: ErrorState = {
      message,
      code: errorCode,
      details,
      timestamp: Date.now(),
    };

    setErrorState(errorState);

    if (onError !== undefined) {
      onError(errorState);
    }
  }, [onError]);

  const clearError = useCallback((): void => {
    setErrorState(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const retry = useCallback(async (retryFn: () => Promise<void> | void): Promise<void> => {
    if (retryCount >= maxRetries) {
      setError('Maximum retry attempts exceeded', 'MAX_RETRIES_EXCEEDED');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Add delay for retries (except first retry)
      if (retryCount > 0) {
        await new Promise<void>((resolve): void => {
          setTimeout((): void => {
            resolve();
          }, retryDelay * retryCount);
        });
      }

      await retryFn();
      
      // Success - clear error
      clearError();
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError : 'Retry failed',
        'RETRY_FAILED',
        retryError
      );
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, retryDelay, setError, clearError]);

  const canRetry = retryCount < maxRetries && !isRetrying;

  return {
    error,
    isRetrying,
    retryCount,
    setError,
    clearError,
    retry,
    canRetry,
  };
} 