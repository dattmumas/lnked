"use client";

import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface AuthFormProps {
  mode: "signIn" | "signUp";
  onSubmit: (formData: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  message?: string | null; // Optional: for sign-up success messages
}

export default function AuthForm({
  mode,
  onSubmit,
  isLoading,
  error,
  message,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Only for sign-up

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData: Record<string, string> = { email, password };
    if (mode === "signUp") {
      formData.fullName = fullName;
    }
    onSubmit(formData);
  };

  const title = mode === "signIn" ? "Sign In" : "Create an Account";
  const description =
    mode === "signIn"
      ? "Enter your email and password to access your account."
      : "Enter your details to get started.";
  const buttonText = mode === "signIn" ? "Sign In" : "Create Account";
  const loadingButtonText =
    mode === "signIn" ? "Signing In..." : "Creating Account...";
  const switchLinkText = mode === "signIn" ? "Sign Up" : "Sign In";
  const switchPromptText =
    mode === "signIn" ? "Don't have an account?" : "Already have an account?";
  const switchLinkHref = mode === "signIn" ? "/sign-up" : "/sign-in";

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4 md:p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signUp" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "signUp" ? "••••••••" : undefined}
                required
                minLength={mode === "signUp" ? 6 : undefined} // Supabase default min password length for sign-up
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && mode === "signUp" && (
              <Alert
                variant="default"
                className="mt-4 bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700"
              >
                <Terminal className="h-4 w-4 text-green-700 dark:text-green-300" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  Success
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {message}
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? loadingButtonText : buttonText}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
          <p className="text-muted-foreground">
            {switchPromptText}
            <Button
              variant="link"
              className="pl-1"
              onClick={() => router.push(switchLinkHref)}
              disabled={isLoading}
            >
              {switchLinkText}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
