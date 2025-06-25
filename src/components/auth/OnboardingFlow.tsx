// User Onboarding Flow Component
// Handles new user setup with profile completion and tenant creation

'use client';

import { Loader2, CheckCircle, User, Building, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOnboarding } from '@/hooks/useOnboarding';

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingFormData {
  username: string;
  full_name: string;
  bio: string;
  collective_name?: string;
  collective_slug?: string;
  collective_description?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OnboardingFlow(): React.JSX.Element {
  const router = useRouter();
  const { completeOnboarding, isCompleting, error } = useOnboarding();
  const [formData, setFormData] = useState<OnboardingFormData>({
    username: '',
    full_name: '',
    bio: '',
  });
  const [step, setStep] = useState<'profile' | 'complete'>('profile');

  // Handle form input changes
  const handleInputChange = (
    field: keyof OnboardingFormData,
    value: string,
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const success = await completeOnboarding({
      username: formData.username.length > 0 ? formData.username : undefined,
      full_name: formData.full_name.length > 0 ? formData.full_name : undefined,
      bio: formData.bio.length > 0 ? formData.bio : undefined,
    });

    if (success === true) {
      setStep('complete');
      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    }
  };

  // Skip onboarding and use defaults
  const handleSkip = async (): Promise<void> => {
    const success = await completeOnboarding();

    if (success === true) {
      router.push('/home');
    }
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to Lnked!</CardTitle>
            <CardDescription>
              Your account has been set up successfully. Redirecting you to your
              dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Let&apos;s set up your account and create your personal space.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-4"
          >
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Display Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your display name"
                value={formData.full_name}
                onChange={(e) => {
                  handleInputChange('full_name', e.target.value);
                }}
              />
              <p className="text-sm text-gray-500">
                This is how others will see your name on Lnked.
              </p>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={(e) => {
                  handleInputChange('username', e.target.value);
                }}
                pattern="^[a-zA-Z0-9_-]+$"
              />
              <p className="text-sm text-gray-500">
                Letters, numbers, underscores, and hyphens only.
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={(e) => {
                  handleInputChange('bio', e.target.value);
                }}
                rows={3}
                maxLength={500}
              />
              <p className="text-sm text-gray-500">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Error Display */}
            {error !== null && error !== undefined && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <Button type="submit" disabled={isCompleting} className="w-full">
                {isCompleting === true ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up your account...
                  </>
                ) : (
                  <>
                    <Building className="w-4 h-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void handleSkip();
                }}
                disabled={isCompleting}
                className="w-full"
              >
                Skip for now
              </Button>
            </div>
          </form>

          {/* What happens next */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              What happens next?
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your personal workspace will be created</li>
              <li>• You can start creating posts and content</li>
              <li>• Join or create collectives with others</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

interface WelcomeStepProps {
  onNext: () => Promise<void>;
}

function WelcomeStep({ onNext }: WelcomeStepProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Welcome to Lnked
        </CardTitle>
        <CardDescription>
          Let&apos;s get you set up with your profile and collective
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => {
            void onNext();
          }}
          className="w-full"
          size="lg"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface ProfileStepProps {
  formData: OnboardingFormData;
  onInputChange: (field: string, value: string) => void;
  onNext: () => Promise<void>;
  isLoading: boolean;
}

function ProfileStep({
  formData,
  onInputChange,
  onNext,
  isLoading,
}: ProfileStepProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Profile</CardTitle>
        <CardDescription>Tell us a bit about yourself</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData.full_name ?? ''}
            onChange={(e) => {
              onInputChange('full_name', e.target.value);
            }}
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username ?? ''}
            onChange={(e) => {
              onInputChange('username', e.target.value);
            }}
            placeholder="Choose a username"
          />
        </div>
        <Button
          onClick={() => {
            void onNext();
          }}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading === true ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface CollectiveStepProps {
  formData: OnboardingFormData;
  onInputChange: (field: string, value: string) => void;
  onNext: () => Promise<void>;
  isLoading: boolean;
}

function CollectiveStep({
  formData,
  onInputChange,
  onNext,
  isLoading,
}: CollectiveStepProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Collective</CardTitle>
        <CardDescription>Set up your collective space</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="collective_name">Collective Name</Label>
          <Input
            id="collective_name"
            value={formData.collective_name ?? ''}
            onChange={(e) => {
              onInputChange('collective_name', e.target.value);
            }}
            placeholder="Enter collective name"
          />
        </div>
        <div>
          <Label htmlFor="collective_slug">Collective URL</Label>
          <Input
            id="collective_slug"
            value={formData.collective_slug ?? ''}
            onChange={(e) => {
              onInputChange('collective_slug', e.target.value);
            }}
            placeholder="collective-url"
          />
        </div>
        <div>
          <Label htmlFor="collective_description">Description</Label>
          <Textarea
            id="collective_description"
            value={formData.collective_description ?? ''}
            onChange={(e) => {
              onInputChange('collective_description', e.target.value);
            }}
            placeholder="Describe your collective"
            rows={3}
          />
        </div>
        <Button
          onClick={() => {
            void onNext();
          }}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading === true ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Collective'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function CompleteStep(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <CardTitle className="text-2xl font-bold text-gray-900">
          All Set!
        </CardTitle>
        <CardDescription>
          Your profile and collective have been created successfully
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-gray-600">
          Redirecting you to your dashboard...
        </p>
      </CardContent>
    </Card>
  );
}
