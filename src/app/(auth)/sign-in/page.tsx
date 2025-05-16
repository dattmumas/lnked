"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/app/auth/AuthForm";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (formData: Record<string, string>) => {
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push("/dashboard");
      router.refresh(); // Ensure the layout re-renders with the new auth state
    }
    setIsLoading(false);
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
