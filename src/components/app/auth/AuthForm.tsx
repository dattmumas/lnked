'use client';

import React, { useState } from 'react';
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
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

// Types
interface AuthFormProps {
  mode: 'signIn' | 'signUp';
  onSubmit: (_formData: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  message?: string | null;
}

interface AuthFormFieldsProps {
  mode: 'signIn' | 'signUp';
  isLoading: boolean;
  email: string;
  setEmail: (_value: string) => void;
  password: string;
  setPassword: (_value: string) => void;
  fullName?: string;
  setFullName?: (_value: string) => void;
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
}) => (
  <>
    {mode === 'signUp' && setFullName && (
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Your Name"
          required
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFullName(e.target.value)
          }
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
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEmail(e.target.value)
        }
        disabled={isLoading}
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData: Record<string, string> = { email, password };
    if (mode === 'signUp') {
      formData.fullName = fullName;
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
