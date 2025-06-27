'use client';

import { useRouter } from 'next/navigation.js';
import { useState, useRef, useCallback } from 'react';

import AuthForm from '@/components/app/auth/AuthForm';
import {
  RateLimiter,
  retryWithBackoff,
  isRateLimitError,
  formatRateLimitMessage,
  getAuthErrorMessage,
} from '@/lib/auth-utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

// Constants for magic numbers
const MIN_FULLNAME_LENGTH = 2;
const MAX_FULLNAME_LENGTH = 100;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const RATE_LIMIT_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const AUTH_MAX_RETRIES = 2;
const AUTH_RETRY_DELAY_MS = 2000;

export default function SignUpPage(): React.JSX.Element {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | undefined>(
    undefined,
  );
  const rateLimiterRef = useRef(
    new RateLimiter(RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS),
  );

  const handleSignUp = useCallback(
    async (formData: Record<string, string>) => {
      setIsLoading(true);
      setError(undefined);
      setMessage(undefined);
      setRateLimitMessage(undefined);

      // Check rate limiting
      if (!rateLimiterRef.current.canAttempt()) {
        const timeUntilReset = rateLimiterRef.current.getTimeUntilReset();
        setRateLimitMessage(formatRateLimitMessage(timeUntilReset, 'sign-up'));
        setIsLoading(false);
        return;
      }

      // Extract and validate form data
      const { email, password, fullName, username } = formData;

      if (!email || !password) {
        setError('Email and password are required');
        setIsLoading(false);
        return;
      }

      if (
        fullName === null ||
        fullName === undefined ||
        fullName.trim().length < MIN_FULLNAME_LENGTH ||
        fullName.trim().length > MAX_FULLNAME_LENGTH
      ) {
        setError(
          `Full name must be between ${MIN_FULLNAME_LENGTH} and ${MAX_FULLNAME_LENGTH} characters long`,
        );
        setIsLoading(false);
        return;
      }

      // Validate username format
      if (
        username === null ||
        username === undefined ||
        username.length < MIN_USERNAME_LENGTH ||
        username.length > MAX_USERNAME_LENGTH
      ) {
        setError(
          `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters long`,
        );
        setIsLoading(false);
        return;
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        setError(
          'Username can only contain lowercase letters, numbers, and underscores',
        );
        setIsLoading(false);
        return;
      }

      try {
        // Record the attempt for rate limiting
        rateLimiterRef.current.recordAttempt();

        // Check if username is already taken
        const { data: existingUser } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .single();

        if (existingUser !== null) {
          setError('Username is already taken. Please choose another one.');
          setIsLoading(false);
          return;
        }

        const { data, error: signUpError } = await retryWithBackoff(
          () =>
            supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username,
                  full_name: fullName,
                },
                // emailRedirectTo: `${window.location.origin}/auth/callback`, // Uncomment if email confirmation is enabled
              },
            }),
          AUTH_MAX_RETRIES,
          AUTH_RETRY_DELAY_MS,
        );

        if (signUpError !== null) {
          // Handle rate limit errors specifically
          if (isRateLimitError(signUpError)) {
            setRateLimitMessage(
              'Authentication service is temporarily busy. Please wait a moment and try again.',
            );
            return;
          }

          setError(getAuthErrorMessage(signUpError));
        } else if (
          data.user !== null &&
          data.user.identities !== null &&
          data.user.identities !== undefined &&
          data.user.identities.length === 0
        ) {
          setError(
            'This email may already be registered but not confirmed. Please check your email or try signing in.',
          );
        } else if (data.session !== null) {
          setMessage('Sign up successful! Redirecting...');
          void router.push('/dashboard');
          void router.refresh(); // Ensure the layout re-renders with the new auth state
        } else if (data.user !== null) {
          setMessage(
            'Sign up successful! Please check your email to confirm your account before signing in.',
          );
        } else {
          setError(
            'An unexpected error occurred during sign up. Please try again.',
          );
        }
      } catch (err: unknown) {
        console.error('Unexpected error during sign up:', err);

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
    [router, supabase],
  );

  return (
    <AuthForm
      mode="signUp"
      onSubmit={handleSignUp}
      isLoading={isLoading}
      error={error !== undefined ? error : rateLimitMessage}
      message={message}
    />
  );
}
