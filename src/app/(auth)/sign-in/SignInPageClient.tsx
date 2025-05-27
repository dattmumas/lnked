'use client';

import { useState, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation.js';
import AuthForm from '@/components/app/auth/AuthForm';
import {
  RateLimiter,
  retryWithBackoff,
  isRateLimitError,
  formatRateLimitMessage,
  getAuthErrorMessage,
} from '@/lib/auth-utils';

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const rateLimiterRef = useRef(new RateLimiter(5, 60000)); // 5 attempts per minute

  const handleSignIn = async (formData: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    setRateLimitMessage(null);

    // Check rate limiting
    if (!rateLimiterRef.current.canAttempt()) {
      const timeUntilReset = rateLimiterRef.current.getTimeUntilReset();
      setRateLimitMessage(formatRateLimitMessage(timeUntilReset, 'sign-in'));
      setIsLoading(false);
      return;
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting sign in for:', formData.email);
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
        console.log('Sign in successful, session established');
      }

      // Verify the session was actually stored with retry
      const sessionCheck = await retryWithBackoff(
        () => supabase.auth.getSession(),
        2,
        1000,
      );

      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Session verification after login:',
          !!sessionCheck.data.session,
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
          console.log('Redirecting to dashboard after successful login');
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
  };

  return (
    <AuthForm
      mode="signIn"
      onSubmit={handleSignIn}
      isLoading={isLoading}
      error={error || rateLimitMessage}
    />
  );
}
