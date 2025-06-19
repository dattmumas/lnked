import * as React from 'react';

import { cn } from '@/lib/utils';

import { Card, CardProps } from './Card';

export interface MetricCardProps extends Omit<CardProps, 'children'> {
  /**
   * The main metric value to display
   */
  value: string | number;
  /**
   * Label describing what the metric represents
   */
  label: string;
  /**
   * Optional trend indicator (percentage change, etc.)
   */
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  /**
   * Optional icon to display alongside the metric
   */
  icon?: React.ReactNode;
  /**
   * Loading state for async metrics
   * @default false
   */
  loading?: boolean;
}

/**
 * MetricCard component for displaying dashboard statistics.
 * Implements the semantic card system for 80% of dashboard metric use cases.
 */
export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    { value, label, trend, icon, loading = false, className, ...props },
    ref,
  ) => {
    const getTrendColor = (direction: 'up' | 'down' | 'neutral'): string => {
      switch (direction) {
        case 'up':
          return 'text-green-600 dark:text-green-400';
        case 'down':
          return 'text-red-600 dark:text-red-400';
        case 'neutral':
          return 'text-content-secondary';
        default:
          return 'text-content-secondary';
      }
    };

    const getTrendIcon = (direction: 'up' | 'down' | 'neutral'): string => {
      switch (direction) {
        case 'up':
          return '↗';
        case 'down':
          return '↘';
        case 'neutral':
          return '→';
        default:
          return '';
      }
    };

    if (loading) {
      return (
        <Card
          ref={ref}
          className={cn('text-center animate-pulse', className)}
          size="md"
          {...props}
        >
          {Boolean(icon) && (
            <div className="flex justify-center mb-3">
              <div className="w-5 h-5 bg-muted rounded" />
            </div>
          )}
          <div className="w-20 h-8 bg-muted rounded mx-auto mb-2" />
          <div className="w-16 h-4 bg-muted rounded mx-auto" />
        </Card>
      );
    }

    return (
      <Card
        ref={ref}
        className={cn('text-center', className)}
        size="md"
        interactive
        {...props}
      >
        {Boolean(icon) && (
          <div className="flex justify-center mb-3 text-content-accent">
            {icon}
          </div>
        )}

        <div className="text-2xl font-bold text-content-primary mb-1">
          {value}
        </div>

        <div className="text-sm text-content-secondary mb-2">{label}</div>

        {trend && (
          <div
            className={cn(
              'text-xs flex items-center justify-center gap-1',
              getTrendColor(trend.direction),
            )}
          >
            <span className="text-xs">{getTrendIcon(trend.direction)}</span>
            <span>{trend.value}</span>
            {Boolean(trend.label) && (
              <span className="text-content-secondary">({trend.label})</span>
            )}
          </div>
        )}
      </Card>
    );
  },
);

MetricCard.displayName = 'MetricCard';
