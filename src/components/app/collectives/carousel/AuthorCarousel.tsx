'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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

export function AuthorCarousel({ collectiveSlug }: AuthorCarouselProps) {
  const { data: collective } = useCollectiveData(collectiveSlug);
  const { data: members, isLoading } = useCollectiveMembers(
    collective?.id ?? '',
    {
      enabled: Boolean(collective?.id),
    },
  );

  const scrollLeft = () => {
    const carousel = document.getElementById('author-carousel');
    if (carousel) {
      carousel.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const carousel = document.getElementById('author-carousel');
    if (carousel) {
      carousel.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="author-carousel-container">
        <h2 className="text-xl font-semibold mb-4">Contributors</h2>
        <div className="flex gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
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

  const displayMembers = members.slice(0, 8); // Max 8 visible as per spec

  return (
    <div className="author-carousel-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Contributors</h2>

        {members.length > 8 && (
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
                    href={`/profile/${member.user?.username ?? '#'}`}
                    className="flex-shrink-0 group"
                  >
                    <div className="author-chip text-center">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20 group-hover:border-accent/40 transition-colors">
                        {member.user?.avatar_url ? (
                          <Image
                            src={member.user.avatar_url}
                            alt={member.user.full_name ?? 'Author'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-lg">
                              {member.user?.full_name?.charAt(0) ?? '?'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <p className="text-xs mt-2 max-w-[4rem] truncate group-hover:text-accent transition-colors">
                        {member.user?.full_name ?? 'Unknown'}
                      </p>
                    </div>
                  </Link>
                </TooltipTrigger>

                <TooltipContent
                  side="bottom"
                  className="max-w-xs p-3"
                  sideOffset={8}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{member.user?.full_name}</p>
                    {member.user?.bio && (
                      <p className="text-sm text-muted-foreground">
                        {member.user.bio.slice(0, 120)}
                        {member.user.bio.length > 120 ? '...' : ''}
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
      {members.length > 8 && (
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
