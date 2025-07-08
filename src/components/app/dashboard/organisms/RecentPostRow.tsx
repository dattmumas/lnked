'use client'; // If any interactivity is planned, otherwise can be server component if props are simple

import { Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { formatDate, cn } from '@/lib/utils';

export interface RecentPostRowProps {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  date: string;
  stats?: {
    views?: number;
    likes?: number;
  };
  className?: string;
}

function RecentPostRow({
  id,
  title,
  status,
  date,
  stats,
  className,
}: RecentPostRowProps): React.ReactElement {
  // URLs prepared for future use

  return (
    <Link
      href={`/posts/${id}`}
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition-colors',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(date)}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase',
                status === 'draft' && 'bg-muted text-muted-foreground',
                status === 'published' &&
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
                status === 'archived' && 'bg-destructive/10 text-destructive',
              )}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {stats !== undefined && stats !== null && (
        <div className="flex items-center gap-4">
          {stats.views !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3" aria-hidden="true" />
              <span>{stats.views}</span>
            </div>
          )}
          {stats.likes !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="size-3" aria-hidden="true" />
              <span>{stats.likes}</span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

export default RecentPostRow;
export { RecentPostRow };
