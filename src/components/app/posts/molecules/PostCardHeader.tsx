'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

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
}: PostCardHeaderProps) {
  const authorName = author.full_name || author.username || 'Anonymous';
  const authorUsername = author.username || 'unknown';
  const authorInitials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
          <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-accent/20 transition-all">
            <AvatarImage
              src={author.avatar_url || undefined}
              alt={authorName}
            />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <span className="font-medium text-card-foreground group-hover:text-accent transition-colors">
              {authorName}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>@{authorUsername}</span>
              <span>•</span>
              <time dateTime={timestamp}>{formattedDate}</time>
            </div>
          </div>
        </Link>

        {collective && (
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
