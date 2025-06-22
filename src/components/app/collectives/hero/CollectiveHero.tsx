'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';

import FollowCollectiveButton from '@/components/FollowCollectiveButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useCollectiveData,
  useCollectiveStats,
} from '@/hooks/collectives/useCollectiveData';
import supabase from '@/lib/supabase/browser';

// Constants
const MAX_TAGS_DISPLAY = 3;

interface CollectiveHeroProps {
  collectiveSlug: string;
}

export function CollectiveHero({
  collectiveSlug,
}: CollectiveHeroProps): React.ReactElement {
  const { data: collective, isLoading } = useCollectiveData(collectiveSlug);
  const { data: stats } = useCollectiveStats(collective?.id ?? '', {
    enabled: Boolean(collective?.id),
  }) as { data: { memberCount: number; followerCount: number } | undefined };
  const [currentUser, setCurrentUser] = useState<{ id: string } | undefined>(
    undefined,
  );
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const fetchUser = useCallback(async (): Promise<void> => {
    const client = supabase;
    const {
      data: { user },
    } = await client.auth.getUser();
    setCurrentUser(user ?? undefined);
    setIsLoadingUser(false);
  }, []);

  useEffect((): void => {
    void fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="collective-meta-card rounded-lg border bg-card text-card-foreground shadow-sm p-6 animate-pulse">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-32 h-32 rounded-full bg-muted"></div>
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!collective) {
    return (
      <div className="collective-meta-card rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="text-center text-muted-foreground">
          Collective not found
        </div>
      </div>
    );
  }

  const isOwner = currentUser?.id === collective.owner_id;

  return (
    <div className="collective-meta-card rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Logo */}
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-accent/20">
          {collective.logo_url !== undefined &&
          collective.logo_url !== null &&
          collective.logo_url.length > 0 ? (
            <Image
              src={collective.logo_url}
              alt={`${collective.name} logo`}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl">🤝</span>
            </div>
          )}
        </div>

        {/* Name and Tagline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">
            {collective.name}
            <span className="text-accent">.</span>
          </h1>

          {collective.description !== undefined &&
            collective.description !== null &&
            collective.description.length > 0 && (
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                {collective.description}
              </p>
            )}

          {/* Owner info */}
          {collective.owner?.full_name !== undefined &&
            collective.owner?.full_name !== null &&
            collective.owner.full_name.length > 0 && (
              <p className="text-xs text-muted-foreground">
                by {collective.owner.full_name}
              </p>
            )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {stats?.followerCount !== undefined &&
            stats.followerCount !== null &&
            stats.followerCount >= 0
              ? stats.followerCount
              : 0}{' '}
            followers
          </span>
          <span>•</span>
          <span>
            {stats?.memberCount !== undefined &&
            stats.memberCount !== null &&
            stats.memberCount >= 0
              ? stats.memberCount
              : 0}{' '}
            members
          </span>
        </div>

        {/* Tags */}
        {collective.tags !== undefined &&
          collective.tags !== null &&
          collective.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {collective.tags.slice(0, MAX_TAGS_DISPLAY).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

        {/* Actions */}
        {!isLoadingUser && (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {!isOwner && currentUser !== undefined && (
              <FollowCollectiveButton
                targetCollectiveId={collective.id}
                targetCollectiveName={collective.name}
                initialIsFollowing={false}
                currentUserId={currentUser.id}
              />
            )}

            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/collectives/${collective.slug}/settings`}>
                  Manage Collective
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
