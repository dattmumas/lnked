'use client';

import React from 'react';

import FollowButton from '@/components/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  getOptimizedAvatarUrl,
  generateUserInitials,
} from '@/lib/utils/avatar';
import { useCollectiveContext } from '@/providers/CollectiveProvider';

const AVATAR_SIZE_LARGE = 96;
const AVATAR_QUALITY_HIGH = 85;

export function CollectiveHero({
  className = '',
}: {
  className?: string;
}): React.ReactElement {
  const { collective, metrics, isFollowing } = useCollectiveContext();

  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const isOwner = false; // TODO: Implement ownership check for collectives

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
            src={getOptimizedAvatarUrl(collective.logo_url ?? undefined, {
              width: AVATAR_SIZE_LARGE,
              height: AVATAR_SIZE_LARGE,
              quality: AVATAR_QUALITY_HIGH,
            })}
            alt={`${collective.name}'s logo`}
          />
          <AvatarFallback className="text-3xl font-semibold">
            {generateUserInitials(collective.name, collective.slug)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-foreground">
            {collective.name}
          </h1>
          <p className="text-md text-muted-foreground">@{collective.slug}</p>
        </div>
      </div>

      {collective.description && (
        <p className="mt-4 max-w-2xl text-base text-foreground/80">
          {collective.description}
        </p>
      )}

      <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">
            {formatCount(metrics.postCount)}
          </span>
          <span>Posts</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">
            {formatCount(metrics.memberCount)}
          </span>
          <span>Members</span>
        </div>
      </div>

      <div className="mt-6">
        {isOwner ? (
          <Button variant="outline">Edit Collective</Button>
        ) : (
          <FollowButton
            targetUserId={collective.id}
            targetUserName={collective.slug}
            initialIsFollowing={isFollowing}
            targetType="collective"
          />
        )}
      </div>
    </header>
  );
}
