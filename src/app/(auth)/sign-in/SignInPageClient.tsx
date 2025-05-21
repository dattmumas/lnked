"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation.js";
import AuthForm from "@/components/app/auth/AuthForm";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (formData: Record<string, string>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("Attempting sign in for:", formData.email);
      }
      // Create a fresh client instance for this request
      const supabase = createSupabaseBrowserClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

      if (signInError) {
        console.error("Sign in error:", signInError);
        setError(signInError.message);
        return;
      }

      if (!data?.session) {
        setError("Authentication succeeded but no session was returned");
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("Sign in successful, session established");
      }

      // Verify the session was actually stored
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (process.env.NODE_ENV === "development") {
        console.log("Session verification after login:", !!sessionCheck.session);
      }

      if (!sessionCheck.session) {
        console.error("Session verification failed - not redirecting");
        setError("Session was not persisted properly. Please try again.");
        return;
      }

      // Ensure the session is set before redirecting
      router.refresh(); // Force a refresh of the router state

      // Add a longer delay to ensure the session is properly registered
      // This gives cookies time to be properly set across all contexts
      setTimeout(() => {
        if (process.env.NODE_ENV === "development") {
          console.log("Redirecting to dashboard after successful login");
        }
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Unexpected error during sign in:", err);
      setError(
        typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      mode="signIn"
      onSubmit={handleSignIn}
      isLoading={isLoading}
      error={error}
    />
  );
}
