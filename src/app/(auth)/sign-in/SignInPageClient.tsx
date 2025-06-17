'use client';

import { useRouter, useSearchParams } from 'next/navigation.js';
import { useState, useRef, useEffect, useCallback } from 'react';

import AuthForm from '@/components/app/auth/AuthForm';
import {
  RateLimiter,
  retryWithBackoff,
  isRateLimitError,
  formatRateLimitMessage,
  getAuthErrorMessage,
} from '@/lib/auth-utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purge = searchParams.get('purge') === '1';

  // Clear stale browser tokens if instructed by middleware
  useEffect(() => {
    if (purge) {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.signOut();
    }
  }, [purge]);

  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | undefined>(
    undefined,
  );
  const rateLimiterRef = useRef(new RateLimiter(5, 60000)); // 5 attempts per minute

  const handleSignIn = useCallback(
    async (formData: Record<string, string>) => {
      setIsLoading(true);
      setError(undefined);
      setRateLimitMessage(undefined);

      // Check rate limiting
      if (!rateLimiterRef.current.canAttempt()) {
        const timeUntilReset = rateLimiterRef.current.getTimeUntilReset();
        setRateLimitMessage(formatRateLimitMessage(timeUntilReset, 'sign-in'));
        setIsLoading(false);
        return;
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.info('Attempting sign in for:', formData.email);
        }

        // Record the attempt for rate limiting
        rateLimiterRef.current.recordAttempt();

        // Create a fresh client instance for this request
        const supabase = createSupabaseBrowserClient();

        // Use retry logic for the authentication request
        const { data, error: signInError } = await retryWithBackoff(
          () =>
            supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            }),
          2, // Max 2 retries for auth requests
          2000, // 2 second base delay
        );

        if (signInError) {
          console.error('Sign in error:', signInError);

          // Handle rate limit errors specifically
          if (isRateLimitError(signInError)) {
            setRateLimitMessage(
              'Authentication service is temporarily busy. Please wait a moment and try again.',
            );
            return;
          }

          setError(getAuthErrorMessage(signInError));
          return;
        }

        if (!data?.session) {
          setError('Authentication succeeded but no session was returned');
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.info('Sign in successful, session established');
        }

        // Verify the session was actually stored with retry
        const sessionCheck = await retryWithBackoff(
          () => supabase.auth.getSession(),
          2,
          1000,
        );

        if (process.env.NODE_ENV === 'development') {
          console.info(
            'Session verification after login:',
            Boolean(sessionCheck.data.session),
          );
        }

        if (!sessionCheck.data.session) {
          console.error('Session verification failed - not redirecting');
          setError('Session was not persisted properly. Please try again.');
          return;
        }

        // Ensure the session is set before redirecting
        router.refresh();

        // Add a longer delay to ensure the session is properly registered
        // This gives cookies time to be properly set across all contexts
        setTimeout(() => {
          if (process.env.NODE_ENV === 'development') {
            console.info('Redirecting to dashboard after successful login');
          }
          router.push('/dashboard');
        }, 1000);
      } catch (err) {
        console.error('Unexpected error during sign in:', err);

        // Handle rate limit errors specifically
        if (isRateLimitError(err)) {
          setRateLimitMessage(
            'Too many requests to the authentication service. Please wait a few minutes before trying again.',
          );
          return;
        }

        setError(getAuthErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  return (
    <AuthForm
      mode="signIn"
      onSubmit={handleSignIn}
      isLoading={isLoading}
      error={error || rateLimitMessage}
    />
  );
}
