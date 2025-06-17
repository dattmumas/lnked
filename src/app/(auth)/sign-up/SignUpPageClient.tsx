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

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | undefined>(
    undefined,
  );
  const rateLimiterRef = useRef(new RateLimiter(3, 60000)); // 3 attempts per minute for sign-up

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

      const { fullName } = formData;
      if (
        !fullName ||
        fullName.trim().length < 2 ||
        fullName.trim().length > 100
      ) {
        setError('Full name must be between 2 and 100 characters long');
        setIsLoading(false);
        return;
      }

      // Validate username format
      const { username } = formData;
      if (!username || username.length < 3 || username.length > 20) {
        setError('Username must be between 3 and 20 characters long');
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

        if (existingUser) {
          setError('Username is already taken. Please choose another one.');
          setIsLoading(false);
          return;
        }

        const { data, error: signUpError } = await retryWithBackoff(
          () =>
            supabase.auth.signUp({
              email: formData.email,
              password: formData.password,
              options: {
                data: {
                  username: formData.username,
                  full_name: formData.fullName,
                },
                // emailRedirectTo: `${window.location.origin}/auth/callback`, // Uncomment if email confirmation is enabled
              },
            }),
          2, // Max 2 retries for auth requests
          2000, // 2 second base delay
        );

        if (signUpError) {
          // Handle rate limit errors specifically
          if (isRateLimitError(signUpError)) {
            setRateLimitMessage(
              'Authentication service is temporarily busy. Please wait a moment and try again.',
            );
            return;
          }

          setError(getAuthErrorMessage(signUpError));
        } else if (
          data.user &&
          data.user.identities &&
          data.user.identities.length === 0
        ) {
          setError(
            'This email may already be registered but not confirmed. Please check your email or try signing in.',
          );
        } else if (data.session) {
          setMessage('Sign up successful! Redirecting...');
          router.push('/dashboard');
          router.refresh(); // Ensure the layout re-renders with the new auth state
        } else if (data.user) {
          setMessage(
            'Sign up successful! Please check your email to confirm your account before signing in.',
          );
        } else {
          setError(
            'An unexpected error occurred during sign up. Please try again.',
          );
        }
      } catch (err) {
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
      error={error || rateLimitMessage}
      message={message}
    />
  );
}
