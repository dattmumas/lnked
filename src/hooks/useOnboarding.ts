// User Onboarding Hook
// Manages onboarding status and completion for new users

import { useState, useEffect, useCallback } from 'react';

import { useUser } from '@/hooks/useUser';

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingStatus {
  is_complete: boolean;
  has_personal_tenant: boolean;
  has_profile: boolean;
  steps_completed: {
    profile: boolean;
    tenant_creation: boolean;
  };
}

interface OnboardingData {
  user: {
    id: string;
    email: string;
    full_name?: string;
    created_at: string;
  };
  tenant_context: {
    personalTenant?: { id: string; name: string; slug: string };
    allTenants: Array<{ id: string; name: string; slug: string; type: string; role: string }>;
    defaultTenantId?: string;
  };
  onboarding_status: OnboardingStatus;
}

export interface UseOnboardingReturn {
  // Status
  isOnboardingComplete: boolean;
  needsOnboarding: boolean;
  onboardingData: OnboardingData | null;
  
  // Loading states
  isLoading: boolean;
  isCompleting: boolean;
  
  // Actions
  checkOnboardingStatus: () => Promise<void>;
  completeOnboarding: (profile?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
  }) => Promise<boolean>;
  
  // Error handling
  error: string | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useOnboarding(): UseOnboardingReturn {
  const { user } = useUser();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async () => {
    if (!user) {
      setOnboardingData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/onboarding');
      
      if (!response.ok) {
        throw new Error('Failed to check onboarding status');
      }

      const data: OnboardingData = await response.json();
      setOnboardingData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error checking onboarding status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Complete onboarding
  const completeOnboarding = useCallback(async (profile?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
  }): Promise<boolean> => {
    if (!user) return false;

    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          complete_onboarding: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(String(errorData.error) || 'Failed to complete onboarding');
      }

      const data = await response.json();
      
      // Update onboarding data with the response
      if (data.success) {
        await checkOnboardingStatus(); // Refresh status
        return true;
      }
      
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error completing onboarding:', err);
      return false;
    } finally {
      setIsCompleting(false);
    }
  }, [user, checkOnboardingStatus]);

  // Auto-check onboarding status when user changes
  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      setOnboardingData(null);
    }
  }, [user, checkOnboardingStatus]);

  // Derived state
  const isOnboardingComplete = onboardingData?.onboarding_status?.is_complete || false;
  const needsOnboarding = user && !isOnboardingComplete && !isLoading;

  return {
    // Status
    isOnboardingComplete,
    needsOnboarding: Boolean(needsOnboarding),
    onboardingData,
    
    // Loading states
    isLoading,
    isCompleting,
    
    // Actions
    checkOnboardingStatus,
    completeOnboarding,
    
    // Error handling
    error,
  };
} 