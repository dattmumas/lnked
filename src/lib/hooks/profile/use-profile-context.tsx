'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import {
  useProfile,
  useProfileMetrics,
  useFollowStatus,
} from './use-profile-data';

import type { ProfileContextValue } from './types';

// Create the context
const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

// Skeleton list lengths – avoids magic numbers
const SKELETON_FOLLOWER_COUNT = 3;
const SKELETON_POST_COUNT = 6;

// Profile context provider component
export interface ProfileContextProviderProps {
  username: string;
  children: React.ReactNode;
}

export function ProfileContextProvider({
  username,
  children,
}: ProfileContextProviderProps): React.ReactElement {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    undefined,
  );
  const [authLoading, setAuthLoading] = useState(true);

  // Get current user authentication status
  useEffect(() => {
    const getCurrentUser = async (): Promise<void> => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id);
      } catch (error) {
        console.error('Error getting current user:', error);
        setCurrentUserId(undefined);
      } finally {
        setAuthLoading(false);
      }
    };

    void getCurrentUser();

    // Listen for auth changes
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all profile data using React Query hooks
  const profileQuery = useProfile(username);
  const metricsQuery = useProfileMetrics(username);
  const followStatusQuery = useFollowStatus(username);

  // Compute derived values
  const contextValue = useMemo(() => {
    if (profileQuery.data === undefined || authLoading) {
      return undefined;
    }

    const profile = profileQuery.data;
    const metrics = metricsQuery.data;
    const followStatus = followStatusQuery.data;

    // Check if current user is the profile owner
    const isOwner = currentUserId !== undefined && currentUserId === profile.id;

    // Compute permissions based on profile settings and user status
    const permissions = {
      canEdit: isOwner, // Only owner can edit
      canDelete: isOwner, // Only owner can delete
      canFollow: !isOwner && Boolean(currentUserId), // Can't follow yourself, must be authenticated
      canMessage: !isOwner && Boolean(currentUserId), // Can't message yourself, must be authenticated
    };

    return {
      profile,
      metrics: metrics ?? {
        followerCount: 0,
        followingCount: 0,
        postCounts: { writing: 0, video: 0, total: 0 },
        totalViews: 0,
        totalLikes: 0,
      },
      isOwner,
      canEdit: permissions.canEdit,
      isFollowing: followStatus?.isFollowing ?? false,
      permissions,
    };
  }, [
    profileQuery.data,
    metricsQuery.data,
    followStatusQuery.data,
    currentUserId,
    authLoading,
  ]);

  // Show loading state while fetching essential data
  if (profileQuery.isLoading || authLoading) {
    return <ProfileSkeleton />;
  }

  // Show error state if profile fetch failed
  if (profileQuery.error || contextValue === undefined) {
    return <ProfileError error={profileQuery.error} />;
  }

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

// Hook to use profile context
export function useProfileContext(): ProfileContextValue {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error(
      'useProfileContext must be used within a ProfileContextProvider',
    );
  }

  return context;
}

// --- Skeleton helper components ---------------------------------------------

function FollowerSkeletonItem(): React.ReactElement {
  return (
    <div className="flex gap-3">
      <div className="h-10 w-10 bg-muted rounded-full" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-full" />
      </div>
    </div>
  );
}

function PostSkeletonItem({ index }: { index: number }): React.ReactElement {
  return (
    <div key={index} className="bg-card rounded-lg border overflow-hidden">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    </div>
  );
}

// Loading skeleton component
function ProfileSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-[1fr_65%_35%_1fr] gap-8 px-8 max-lg:grid-cols-1">
        {/* Hero skeleton */}
        <div className="col-start-2 max-lg:col-start-1">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex gap-4">
              <div className="h-32 w-32 bg-muted rounded-full flex-shrink-0" />
              <div className="space-y-3 flex-1">
                <div className="h-6 bg-muted rounded w-48" />
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-20" />
                  <div className="h-6 bg-muted rounded w-18" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social sidebar skeleton */}
        <div className="col-start-3 max-lg:col-start-1">
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            <div className="flex gap-2">
              <div className="h-8 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-16" />
              <div className="h-8 bg-muted rounded w-24" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: SKELETON_FOLLOWER_COUNT }, (_, i) => (
                <FollowerSkeletonItem key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Content area skeleton */}
        <div className="col-span-2 max-lg:col-span-1 space-y-6">
          <div className="flex gap-2">
            <div className="h-10 bg-muted rounded w-20" />
            <div className="h-10 bg-muted rounded w-16" />
            <div className="h-10 bg-muted rounded w-18" />
          </div>

          <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-md:grid-cols-1">
            {Array.from({ length: SKELETON_POST_COUNT }, (_, i) => (
              <PostSkeletonItem index={i} key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Error display component
interface ProfileErrorProps {
  error?: Error;
}

function ProfileError({ error }: ProfileErrorProps): React.ReactElement {
  const handleGoBack = useCallback((): void => {
    window.history.back();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-4">
        <div className="text-6xl">😕</div>
        <h2 className="text-2xl font-semibold text-foreground">
          Profile Not Found
        </h2>
        <p className="text-muted-foreground max-w-md">
          {error?.message ??
            "The profile you're looking for doesn't exist or has been made private."}
        </p>
        <button
          onClick={handleGoBack}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

// Export the provider and hook for use in components
export { ProfileContext };
