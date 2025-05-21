"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation.js";
import AuthForm from "@/components/app/auth/AuthForm";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (formData: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
        // emailRedirectTo: `${window.location.origin}/auth/callback`, // Uncomment if email confirmation is enabled
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setError(
        "This email may already be registered but not confirmed. Please check your email or try signing in."
      );
    } else if (data.session) {
      setMessage("Sign up successful! Redirecting...");
      router.push("/dashboard");
      router.refresh(); // Ensure the layout re-renders with the new auth state
    } else if (data.user) {
      setMessage(
        "Sign up successful! Please check your email to confirm your account before signing in."
      );
    } else {
      setError(
        "An unexpected error occurred during sign up. Please try again."
      );
    }
    setIsLoading(false);
  };

  return (
    <AuthForm
      mode="signUp"
      onSubmit={handleSignUp}
      isLoading={isLoading}
      error={error}
      message={message}
    />
  );
}
