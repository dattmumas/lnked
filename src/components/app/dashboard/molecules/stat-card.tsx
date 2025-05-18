"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: ReactNode;
  className?: string;
  trend?: number;
}

export default function StatCard({
  title,
  value,
  icon,
  description,
  className,
  trend,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-col p-4 h-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {icon && (
            <span className="size-4 text-muted-foreground" aria-hidden="true">
              {icon}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{value}</span>

          {typeof trend === "number" && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                trend > 0
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-destructive"
              )}
            >
              {trend > 0 ? "+" : ""}
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </Card>
  );
}

// Also export named for convenience
export { StatCard };
