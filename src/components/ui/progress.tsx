import { cn } from '@/lib/utils';

import type { ReactElement } from 'react';


const PERCENT_MAX = 100;

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps): ReactElement {
  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-2', className)}>
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(PERCENT_MAX, Math.max(0, value))}%` }}
      />
    </div>
  );
}
