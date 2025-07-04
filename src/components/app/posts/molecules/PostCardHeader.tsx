'use client';

import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Constants
const MAX_INITIALS_LENGTH = 2;

interface Author {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Collective {
  id: string;
  name: string;
  slug: string;
}

interface PostCardHeaderProps {
  author: Author;
  timestamp: string;
  collective?: Collective | null;
  showFollowButton?: boolean;
  currentUserId?: string;
  onFollow?: () => void;
  isFollowing?: boolean;
}

export default function PostCardHeader({
  author,
  timestamp,
  collective,
  showFollowButton = false,
  currentUserId,
  onFollow,
  isFollowing = false,
}: PostCardHeaderProps): React.ReactElement {
  const authorName =
    author.full_name !== undefined &&
    author.full_name !== null &&
    author.full_name.length > 0
      ? author.full_name
      : author.username !== undefined &&
          author.username !== null &&
          author.username.length > 0
        ? author.username
        : 'Anonymous';

  const authorUsername =
    author.username !== undefined &&
    author.username !== null &&
    author.username.length > 0
      ? author.username
      : 'unknown';

  const authorInitials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS_LENGTH);

  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isOwnPost = currentUserId === author.id;

  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/profile/${authorUsername}`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="h-9 w-9 ring-2 ring-transparent group-hover:ring-accent/20 transition-all">
            <AvatarImage
              src={
                author.avatar_url !== undefined &&
                author.avatar_url !== null &&
                author.avatar_url.length > 0
                  ? author.avatar_url
                  : undefined
              }
              alt={authorName}
            />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-medium text-card-foreground group-hover:text-accent transition-colors">
                {authorName}
              </span>
              <span className="text-sm text-muted-foreground">
                @{authorUsername}
              </span>
            </div>
            <time
              dateTime={timestamp}
              className="text-xs text-muted-foreground"
            >
              {formattedDate}
            </time>
          </div>
        </Link>

        {collective !== undefined && collective !== null && (
          <Link href={`/collectives/${collective.slug}`}>
            <Badge
              variant="secondary"
              className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              in {collective.name}
            </Badge>
          </Link>
        )}
      </div>

      {showFollowButton && !isOwnPost && onFollow && (
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          size="sm"
          onClick={onFollow}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}
