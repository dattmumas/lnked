import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

export function RecentPostRowSkeleton(): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
      <div className="flex-1 min-w-0">
        <Skeleton className="h-5 w-3/4" /> {/* Title */}
        <Skeleton className="h-3 w-1/2 mt-2" /> {/* Date/Status line */}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Skeleton className="h-6 w-20 rounded-full" /> {/* Badge placeholder */}
        <Skeleton className="h-8 w-8 rounded-sm" /> {/* Button placeholder */}
        <Skeleton className="h-8 w-8 rounded-sm" /> {/* Button placeholder */}
      </div>
    </div>
  );
}
