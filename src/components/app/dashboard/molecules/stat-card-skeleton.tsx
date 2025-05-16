import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-2/3" /> {/* Label */}
        <Skeleton className="h-5 w-5 rounded-sm" /> {/* Icon placeholder */}
      </div>
      <Skeleton className="h-8 w-1/2 mt-1" /> {/* Value */}
      <Skeleton className="h-3 w-3/4 mt-1" /> {/* Trend line */}
    </Card>
  );
}
