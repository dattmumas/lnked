import React from 'react';

import { cn } from '@/lib/utils';

import { Skeleton } from './skeleton';

interface CommentsSkeletonProps {
  className?: string;
  commentCount?: number;
}

const DEFAULT_COMMENT_COUNT = 3;

export function CommentsSkeleton({
  className,
  commentCount = DEFAULT_COMMENT_COUNT,
}: CommentsSkeletonProps): React.JSX.Element {
  return (
    <div className={cn('space-y-4', className)} aria-label="Loading comments">
      {Array.from({ length: commentCount }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          {/* Avatar placeholder */}
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

          <div className="flex-1 space-y-2">
            {/* Username and timestamp placeholder */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Comment content placeholder */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              {i === 0 && <Skeleton className="h-4 w-1/2" />}
            </div>

            {/* Action buttons placeholder */}
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
