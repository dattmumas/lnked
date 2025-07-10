'use client';

import { createContext, useContext, useMemo } from 'react';

import { ContentArea } from '@/components/app/profile/content/ContentArea';
import { ProfileHero } from '@/components/app/profile/hero/ProfileHero';
import {
  useProfile,
  useProfileMetrics,
  useFollowStatus,
  useProfilePosts,
} from '@/lib/hooks/profile/use-profile-data';

import type { Profile, ProfileMetrics } from '@/lib/hooks/profile/types';

interface ProfileContextValue {
  profile: Profile;
  metrics: ProfileMetrics;
  isFollowing: boolean;
  isOwner: boolean;
  canEdit: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}

export function ProfilePageClient({
  username,
  currentUserId,
}: {
  username: string;
  currentUserId?: string;
}) {
  const { data: profile, isLoading: profileLoading } = useProfile(username);
  const { data: metrics, isLoading: metricsLoading } =
    useProfileMetrics(username);
  const { data: followStatus, isLoading: followStatusLoading } =
    useFollowStatus(username);
  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfilePosts(username);

  const isOwner = useMemo(
    () => profile?.id === currentUserId,
    [profile, currentUserId],
  );

  const contextValue = useMemo(() => {
    if (!profile || !metrics || !followStatus) return null;

    return {
      profile,
      metrics,
      isFollowing: followStatus.isFollowing,
      isOwner,
      canEdit: isOwner,
    };
  }, [profile, metrics, followStatus, isOwner]);

  const isLoading = profileLoading || metricsLoading || followStatusLoading;

  if (isLoading) {
    return <div>Loading profile...</div>; // Or a proper skeleton loader
  }

  if (!contextValue) {
    return <div>Error loading profile data.</div>; // Or a proper error component
  }

  return (
    <ProfileContext.Provider value={contextValue}>
      <div className="container mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
        <ProfileHero
          profile={contextValue.profile}
          metrics={contextValue.metrics}
          isOwner={contextValue.isOwner}
          isFollowing={contextValue.isFollowing}
        />
        <div className="mt-8">
          <ContentArea
            posts={posts ?? []}
            isLoading={postsLoading}
            error={postsError}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </div>
      </div>
    </ProfileContext.Provider>
  );
}
