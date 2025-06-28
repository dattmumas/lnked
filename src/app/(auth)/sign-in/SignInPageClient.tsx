'use client';

import { useRouter, useSearchParams } from 'next/navigation.js';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import AuthForm from '@/components/app/auth/AuthForm';
import {
  retryWithBackoff,
  isRateLimitError,
  formatRateLimitMessage,
  getAuthErrorMessage,
} from '@/lib/auth-utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { SupabaseClient } from '@supabase/supabase-js';

// Default configuration constants
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_MS = 2000;
const DEFAULT_RATE_LIMIT_ATTEMPTS = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_SESSION_VERIFY_RETRIES = 3;
const DEFAULT_SESSION_VERIFY_DELAY_MS = 1000;
const DEFAULT_REDIRECT_DELAY_MS = 500;

// Configuration constants (externalized from magic numbers)
const AUTH_CONFIG = {
  MAX_RETRIES:
    Number(process.env['NEXT_PUBLIC_AUTH_MAX_RETRIES']) || DEFAULT_MAX_RETRIES,
  RETRY_BASE_MS:
    Number(process.env['NEXT_PUBLIC_AUTH_RETRY_BASE_MS']) ||
    DEFAULT_RETRY_BASE_MS,
  SESSION_VERIFY_RETRIES: DEFAULT_SESSION_VERIFY_RETRIES,
  SESSION_VERIFY_DELAY_MS: DEFAULT_SESSION_VERIFY_DELAY_MS,
  RATE_LIMIT_ATTEMPTS:
    Number(process.env['NEXT_PUBLIC_SIGNIN_LIMIT']) ||
    DEFAULT_RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS:
    Number(process.env['NEXT_PUBLIC_SIGNIN_WINDOW']) ||
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  REDIRECT_DELAY_MS: DEFAULT_REDIRECT_DELAY_MS,
} as const;

// Enhanced rate limiter with persistent storage
class PersistentRateLimiter {
  private readonly key: string;
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number, windowMs: number, key = 'signin_attempts') {
    this.key = key;
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(): boolean {
    const attempts = this.getAttempts();
    const now = Date.now();

    // Clean old attempts
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (validAttempts.length !== attempts.length) {
      this.saveAttempts(validAttempts);
    }

    return validAttempts.length < this.maxAttempts;
  }

  recordAttempt(): void {
    const attempts = this.getAttempts();
    const now = Date.now();
    attempts.push(now);
    this.saveAttempts(attempts);
  }

  getTimeUntilReset(): number {
    const attempts = this.getAttempts();
    if (attempts.length === 0) return 0;

    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  private getAttempts(): number[] {
    try {
      const stored = localStorage.getItem(this.key);
      return stored !== null ? (JSON.parse(stored) as number[]) : [];
    } catch {
      return [];
    }
  }

  private saveAttempts(attempts: number[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(attempts));
    } catch {
      // Fallback to in-memory if localStorage fails
    }
  }

  reset(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Silent fail
    }
  }
}

// Enhanced auth service with proper cleanup and error handling
interface AuthService {
  supabase: SupabaseClient;
  rateLimiter: PersistentRateLimiter;
  cleanup: () => void;
}

// Sanitize error messages for production
function getSafeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return getAuthErrorMessage(error);
  }

  // Production: return generic messages only
  const errorStr = getAuthErrorMessage(error);

  // Map internal errors to user-safe messages
  if (errorStr.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (errorStr.includes('Email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }

  if (errorStr.includes('Too many requests')) {
    return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
  }

  // Generic fallback
  return 'Sign-in failed. Please check your credentials and try again.';
}

// Session verification with proper event handling
function verifySessionPersistence(
  supabase: SupabaseClient,
  abortSignal: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    let timeoutId: NodeJS.Timeout;

    const checkSession = async (): Promise<void> => {
      if (abortSignal.aborted) {
        resolve(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session !== null) {
          resolve(true);
          return;
        }

        attempts++;
        if (attempts >= AUTH_CONFIG.SESSION_VERIFY_RETRIES) {
          resolve(false);
          return;
        }

        timeoutId = setTimeout(() => {
          void checkSession();
        }, AUTH_CONFIG.SESSION_VERIFY_DELAY_MS);
      } catch {
        resolve(false);
      }
    };

    // Start verification
    void checkSession();

    // Cleanup on abort
    if (abortSignal !== null) {
      abortSignal.addEventListener('abort', () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        resolve(false);
      });
    }
  });
}

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purge = searchParams.get('purge') === '1';

  // Memoized auth service to prevent re-creation on every render
  const authService = useMemo((): AuthService => {
    const supabase = createSupabaseBrowserClient();
    const rateLimiter = new PersistentRateLimiter(
      AUTH_CONFIG.RATE_LIMIT_ATTEMPTS,
      AUTH_CONFIG.RATE_LIMIT_WINDOW_MS,
    );

    return {
      supabase,
      rateLimiter,
      cleanup: () => {
        // Cleanup logic if needed
      },
    };
  }, []);

  // State management with proper separation
  const [authError, setAuthError] = useState<string | undefined>(undefined);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clear stale browser tokens if instructed by middleware
  useEffect((): void => {
    if (purge) {
      void authService.supabase.auth.signOut();
    }
  }, [purge, authService.supabase.auth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
      authService.cleanup();
    };
  }, [authService]);

  const handleSignIn = useCallback(
    async (formData: Record<string, string>): Promise<void> => {
      // Abort any previous requests
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setIsLoading(true);
      setAuthError(undefined);
      setRateLimitMessage(undefined);
      setIsRedirecting(false);

      try {
        // Check rate limiting first
        if (!authService.rateLimiter.canAttempt()) {
          const timeUntilReset = authService.rateLimiter.getTimeUntilReset();
          setRateLimitMessage(
            formatRateLimitMessage(timeUntilReset, 'sign-in'),
          );
          return;
        }

        // Record attempt for rate limiting
        authService.rateLimiter.recordAttempt();

        // Extract and validate form data
        const { email, password } = formData;

        if (!email || !password) {
          setAuthError('Email and password are required');
          return;
        }

        // Development logging (email anonymized)
        if (process.env.NODE_ENV === 'development') {
          const anonymizedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
          console.warn('Auth attempt for:', anonymizedEmail);
        }

        // Authentication with retry and abort support
        const { data, error: signInError } = await retryWithBackoff(
          () =>
            authService.supabase.auth.signInWithPassword({
              email,
              password,
            }),
          AUTH_CONFIG.MAX_RETRIES,
          AUTH_CONFIG.RETRY_BASE_MS,
        );

        if (signal.aborted) return;

        if (signInError !== null) {
          console.error('Sign-in error:', signInError.message);

          if (isRateLimitError(signInError)) {
            setRateLimitMessage(
              'Authentication service is temporarily busy. Please wait a moment and try again.',
            );
            return;
          }

          setAuthError(getSafeErrorMessage(signInError));
          return;
        }

        if (data?.session === null || data?.session === undefined) {
          setAuthError('Authentication succeeded but no session was returned');
          return;
        }

        // Verify session persistence with proper event handling
        setIsRedirecting(true);
        const sessionVerified = await verifySessionPersistence(
          authService.supabase,
          signal,
        );

        if (signal.aborted) return;

        if (!sessionVerified) {
          console.error('Session verification failed');
          setAuthError('Session was not persisted properly. Please try again.');
          setIsRedirecting(false);
          return;
        }

        // Ensure personal tenant cookie
        await fetch('/api/auth/ensure-tenant', { method: 'POST' });

        // Success: refresh router and redirect
        void router.refresh();

        // Reduced delay with proper state management
        setTimeout(() => {
          if (!signal.aborted) {
            void router.push('/home');
          }
        }, AUTH_CONFIG.REDIRECT_DELAY_MS);
      } catch (err: unknown) {
        if (signal.aborted) return;

        console.error('Unexpected sign-in error:', err);

        if (isRateLimitError(err)) {
          setRateLimitMessage(
            'Too many requests to the authentication service. Please wait a few minutes before trying again.',
          );
          return;
        }

        setAuthError(getSafeErrorMessage(err));
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [authService, router],
  );

  const handleClearRateLimit = useCallback((): void => {
    authService.rateLimiter.reset();
    setRateLimitMessage(undefined);
  }, [authService.rateLimiter]);

  return (
    <div role="main" aria-label="Sign in">
      {/* Accessibility: Loading announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && 'Signing in, please wait...'}
        {isRedirecting && 'Sign in successful, redirecting to dashboard...'}
        {rateLimitMessage !== null &&
          rateLimitMessage !== undefined &&
          `Rate limit: ${rateLimitMessage}`}
        {authError !== null && authError !== undefined && `Error: ${authError}`}
      </div>

      <AuthForm
        mode="signIn"
        onSubmit={handleSignIn}
        isLoading={isLoading || isRedirecting}
        error={authError ?? rateLimitMessage}
      />

      {/* Rate limit reset button for better UX */}
      {rateLimitMessage !== undefined && (
        <button
          type="button"
          onClick={handleClearRateLimit}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          disabled={isLoading || isRedirecting}
        >
          Reset rate limit
        </button>
      )}
    </div>
  );
}
