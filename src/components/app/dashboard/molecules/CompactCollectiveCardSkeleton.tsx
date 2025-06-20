import React from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CompactCollectiveCardSkeleton(): React.ReactElement {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-grow">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-6 w-6 rounded-sm" /> {/* Icon placeholder */}
          <Skeleton className="h-6 w-3/4" /> {/* Title */}
        </div>
        <Skeleton className="h-4 w-full mb-1" /> {/* Description line 1 */}
        <Skeleton className="h-4 w-2/3" /> {/* Description line 2 (shorter) */}
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <Skeleton className="h-9 w-full mt-2" /> {/* Button placeholder */}
      </CardContent>
    </Card>
  );
}
