'use client';

import { Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


// Types
interface AuthFormProps {
  mode: 'signIn' | 'signUp';
  onSubmit: (_formData: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  error: string | undefined;
  message?: string | undefined;
}

interface AuthFormFieldsProps {
  mode: 'signIn' | 'signUp';
  isLoading: boolean;
  email: string;
  setEmail: (_value: string) => void;
  password: string;
  setPassword: (_value: string) => void;
  fullName?: string; // Add full_name
  setFullName?: (_value: string) => void;
  username?: string;
  setUsername?: (_value: string) => void;
}

interface AuthFormHeaderProps {
  title: string;
  description: string;
}

interface AuthFormFooterProps {
  isLoading: boolean;
  promptText: string;
  linkText: string;
  linkHref: string;
}

// Sub-components
const AuthFormHeaderComponent: React.FC<AuthFormHeaderProps> = ({
  title,
  description,
}) => (
  <CardHeader className="text-center">
    <CardTitle className="text-2xl">{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
);

const AuthFormFieldsComponent: React.FC<AuthFormFieldsProps> = ({
  mode,
  isLoading,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  username,
  setUsername,
}) => (
  <>
    {/* Full Name field (required for sign-up) */}
    {mode === 'signUp' && setFullName && (
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          required
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFullName(e.target.value)
          }
          disabled={isLoading}
          minLength={2}
          maxLength={100}
          title="Full name must be 2-100 characters long"
        />
      </div>
    )}
    {mode === 'signUp' && setUsername && (
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="username"
          required
          value={username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            // Convert to lowercase and remove invalid characters
            const value = e.target.value
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '');
            setUsername(value);
          }}
          disabled={isLoading}
          pattern="^[a-z0-9_]+$"
          minLength={3}
          maxLength={20}
          title="Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores"
        />
        <p className="text-xs text-muted-foreground">
          3-20 characters, lowercase letters, numbers, and underscores only
        </p>
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
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEmail(e.target.value)
        }
        disabled={isLoading}
        autoComplete="email"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        placeholder={mode === 'signUp' ? '••••••••' : undefined}
        required
        minLength={mode === 'signUp' ? 6 : undefined}
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setPassword(e.target.value)
        }
        disabled={isLoading}
        autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
      />
    </div>
  </>
);

const AuthFormFooterComponent: React.FC<AuthFormFooterProps> = ({
  isLoading,
  promptText,
  linkText,
  linkHref,
}) => {
  const router = useRouter();
  return (
    <CardFooter className="flex flex-col items-center space-y-2 text-sm">
      <p className="text-muted-foreground">
        {promptText}
        <Button
          variant="link"
          className="pl-1"
          onClick={() => router.push(linkHref)}
          disabled={isLoading}
        >
          {linkText}
        </Button>
      </p>
    </CardFooter>
  );
};

// Main AuthForm Component
export default function AuthForm({
  mode,
  onSubmit,
  isLoading,
  error,
  message,
}: AuthFormProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData: Record<string, string> = { email, password };
    if (mode === 'signUp') {
      formData.fullName = fullName;
      formData.username = username;
    }
    onSubmit(formData);
  };

  const content = {
    title: mode === 'signIn' ? 'Sign In' : 'Create an Account',
    description:
      mode === 'signIn'
        ? 'Enter your email and password to access your account.'
        : 'Enter your details to get started.',
    buttonText: mode === 'signIn' ? 'Sign In' : 'Create Account',
    loadingButtonText:
      mode === 'signIn' ? 'Signing In...' : 'Creating Account...',
    switchLinkText: mode === 'signIn' ? 'Sign Up' : 'Sign In',
    switchPromptText:
      mode === 'signIn'
        ? 'Don&apos;t have an account?'
        : 'Already have an account?',
    switchLinkHref: mode === 'signIn' ? '/sign-up' : '/sign-in',
  };

  return (
    <div className="flex items-center justify-center p-4 md:p-6 bg-muted/40 min-h-full">
      <Card className="w-full max-w-sm">
        <AuthFormHeaderComponent
          title={content.title}
          description={content.description}
        />
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthFormFieldsComponent
              mode={mode}
              isLoading={isLoading}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              username={mode === 'signUp' ? username : undefined}
              setUsername={mode === 'signUp' ? setUsername : undefined}
              fullName={mode === 'signUp' ? fullName : undefined}
              setFullName={mode === 'signUp' ? setFullName : undefined}
            />
            {error && (
              <Alert variant="destructive" className="mt-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && mode === 'signUp' && (
              <Alert variant="default" className="mt-4 bg-accent/10">
                <Terminal className="h-4 w-4 text-accent" />
                <AlertTitle className="text-accent">Success</AlertTitle>
                <AlertDescription className="text-accent">
                  {message}
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? content.loadingButtonText : content.buttonText}
            </Button>
          </form>
        </CardContent>
        <AuthFormFooterComponent
          isLoading={isLoading}
          promptText={content.switchPromptText}
          linkText={content.switchLinkText}
          linkHref={content.switchLinkHref}
        />
      </Card>
    </div>
  );
}
