import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardSkeletonProps {
  className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden animate-pulse", className)}>
      <div className="flex flex-col p-4 h-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>

        <div className="flex items-baseline gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>

        <Skeleton className="h-3 w-32 mt-2" />
      </div>
    </Card>
  );
}
