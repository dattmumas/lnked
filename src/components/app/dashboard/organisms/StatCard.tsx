import React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: React.ReactNode;
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
}: StatCardProps): React.ReactElement {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex flex-col p-4 h-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
          {icon !== undefined && icon !== null && (
            <span className="size-4 text-foreground/60" aria-hidden="true">
              {icon}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{value}</span>

          {typeof trend === 'number' && (
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                trend > 0
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-destructive',
              )}
            >
              {trend > 0 ? '+' : ''}
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        {description !== undefined && description !== null && (
          <p className="mt-1 text-xs text-foreground/60">{description}</p>
        )}
      </div>
    </Card>
  );
}

// Also export named for convenience
export { StatCard };
