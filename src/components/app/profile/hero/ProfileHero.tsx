'use client';

import React from 'react';

import SubscribeButton from '@/components/app/profile/subscription/SubscribeButton';
import FollowButton from '@/components/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  getOptimizedAvatarUrl,
  generateUserInitials,
} from '@/lib/utils/avatar';

import type { Profile, ProfileMetrics } from '@/lib/hooks/profile/types';

interface ProfileHeroProps {
  profile: Profile;
  metrics: ProfileMetrics;
  isOwner: boolean;
  isFollowing: boolean;
  className?: string;
}

const AVATAR_SIZE_LARGE = 96;
const AVATAR_QUALITY_HIGH = 85;

export function ProfileHero({
  profile,
  metrics,
  isOwner,
  isFollowing,
  className = '',
}: ProfileHeroProps): React.ReactElement {
  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <header
      className={`
        flex flex-col items-center text-center py-8 px-4
        border-b border-border
        ${className}
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-24 h-24 border-2 border-background ring-4 ring-border">
          <AvatarImage
            src={getOptimizedAvatarUrl(profile.avatarUrl ?? undefined, {
              width: AVATAR_SIZE_LARGE,
              height: AVATAR_SIZE_LARGE,
              quality: AVATAR_QUALITY_HIGH,
            })}
            alt={`${profile.fullName ?? profile.username}'s avatar`}
          />
          <AvatarFallback className="text-3xl font-semibold">
            {generateUserInitials(profile.fullName, profile.username)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-foreground">
            {profile.fullName ?? profile.username}
          </h1>
          <p className="text-md text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 max-w-2xl text-base text-foreground/80">
          {profile.bio}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {profile.socialLinks?.location && (
          <div className="flex items-center gap-1">
            <span>{profile.socialLinks.location}</span>
          </div>
        )}
        {profile.socialLinks?.website && (
          <a
            href={profile.socialLinks.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <span>
              {profile.socialLinks.website.replace(/https?:\/\//, '')}
            </span>
          </a>
        )}
      </div>

      <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">
            {formatCount(metrics.postCounts.total)}
          </span>
          <span>Posts</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">
            {formatCount(metrics.followerCount)}
          </span>
          <span>Followers</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">
            {formatCount(metrics.followingCount)}
          </span>
          <span>Following</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {isOwner ? (
          <Button variant="outline">Edit Profile</Button>
        ) : (
          <>
            <FollowButton
              targetUserId={profile.id}
              targetUserName={profile.username ?? ''}
              initialIsFollowing={isFollowing}
            />
            <SubscribeButton
              targetUserId={profile.id}
              targetName={profile.username ?? ''}
            />
          </>
        )}
      </div>
    </header>
  );
}

export default ProfileHero;
