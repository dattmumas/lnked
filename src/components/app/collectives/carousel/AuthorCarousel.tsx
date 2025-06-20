'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useCollectiveData,
  useCollectiveMembers,
} from '@/hooks/collectives/useCollectiveData';

import type { Database } from '@/lib/database.types';

interface AuthorCarouselProps {
  collectiveSlug: string;
}

type CollectiveMember =
  Database['public']['Tables']['collective_members']['Row'] & {
    user: {
      full_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      username: string | null;
    } | null;
  };

// Constants
const MAX_VISIBLE_MEMBERS = 8;
const SKELETON_MEMBERS_COUNT = 6;
const SCROLL_DISTANCE = 200;
const AVATAR_SIZE = 48;
const MAX_BIO_LENGTH = 120;

export function AuthorCarousel({
  collectiveSlug,
}: AuthorCarouselProps): React.ReactElement {
  const { data: collective } = useCollectiveData(collectiveSlug);
  const { data: members, isLoading } = useCollectiveMembers(
    collective?.id ?? '',
    {
      enabled: collective?.id !== undefined && collective?.id !== null,
    },
  );

  const scrollLeft = useCallback((): void => {
    const carousel = document.getElementById('author-carousel');
    if (carousel) {
      carousel.scrollBy({ left: -SCROLL_DISTANCE, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback((): void => {
    const carousel = document.getElementById('author-carousel');
    if (carousel) {
      carousel.scrollBy({ left: SCROLL_DISTANCE, behavior: 'smooth' });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="author-carousel-container">
        <h2 className="text-xl font-semibold mb-4">Contributors</h2>
        <div className="flex gap-4 animate-pulse">
          {Array.from({ length: SKELETON_MEMBERS_COUNT }).map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-muted"></div>
              <div className="w-16 h-3 bg-muted rounded mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!members || !Array.isArray(members) || members.length === 0) {
    return (
      <div className="author-carousel-container">
        <h2 className="text-xl font-semibold mb-4">Contributors</h2>
        <div className="text-center py-8 text-muted-foreground">
          No contributors yet
        </div>
      </div>
    );
  }

  const displayMembers = members.slice(0, MAX_VISIBLE_MEMBERS);

  return (
    <div className="author-carousel-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Contributors</h2>

        {members.length > MAX_VISIBLE_MEMBERS && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="h-8 w-8"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="h-8 w-8"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <div
          id="author-carousel"
          className="flex gap-4 overflow-x-auto scrollbar-hidden pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <TooltipProvider>
            {displayMembers.map((member: CollectiveMember) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={`/profile/${member.user?.username !== undefined && member.user?.username !== null && member.user.username.length > 0 ? member.user.username : '#'}`}
                    className="flex-shrink-0 group"
                  >
                    <div className="author-chip text-center">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20 group-hover:border-accent/40 transition-colors">
                        {member.user?.avatar_url !== undefined &&
                        member.user?.avatar_url !== null &&
                        member.user.avatar_url.length > 0 ? (
                          <Image
                            src={member.user.avatar_url}
                            alt={
                              member.user.full_name !== undefined &&
                              member.user.full_name !== null &&
                              member.user.full_name.length > 0
                                ? member.user.full_name
                                : 'Author'
                            }
                            width={AVATAR_SIZE}
                            height={AVATAR_SIZE}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-lg">
                              {member.user?.full_name !== undefined &&
                              member.user?.full_name !== null &&
                              member.user.full_name.length > 0
                                ? member.user.full_name.charAt(0)
                                : '?'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <p className="text-xs mt-2 max-w-[4rem] truncate group-hover:text-accent transition-colors">
                        {member.user?.full_name !== undefined &&
                        member.user?.full_name !== null &&
                        member.user.full_name.length > 0
                          ? member.user.full_name
                          : 'Unknown'}
                      </p>
                    </div>
                  </Link>
                </TooltipTrigger>

                <TooltipContent
                  side="bottom"
                  className="max-w-xs p-3"
                  sideOffset={MAX_VISIBLE_MEMBERS}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{member.user?.full_name}</p>
                    {member.user?.bio !== undefined &&
                      member.user?.bio !== null &&
                      member.user.bio.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {member.user.bio.slice(0, MAX_BIO_LENGTH)}
                          {member.user.bio.length > MAX_BIO_LENGTH ? '...' : ''}
                        </p>
                      )}
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.role}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* View all link if more than 8 members */}
      {members.length > MAX_VISIBLE_MEMBERS && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/collectives/${collectiveSlug}/members`}>
              View all {members.length} contributors
            </Link>
          </Button>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
