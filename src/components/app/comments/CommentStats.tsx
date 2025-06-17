import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

interface CommentStatsProps {
  count: number;
  loading: boolean;
  className?: string;
}

export const CommentStats: React.FC<CommentStatsProps> = ({
  count,
  loading,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground">
        {count === 0
          ? 'No comments yet'
          : `${count.toLocaleString()} ${count === 1 ? 'comment' : 'comments'}`}
      </h3>
    </div>
  );
};
