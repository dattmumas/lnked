import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface IconProps {
  icon: LucideIcon;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

/**
 * Optimized Icon component with high-fidelity SVG rendering
 *
 * Features:
 * - Geometric precision rendering for crisp edges
 * - Consistent stroke properties
 * - Standardized sizing
 * - High-DPI support
 */
export function Icon({
  icon: IconComponent,
  className,
  size = 'sm',
  strokeWidth = 1.5,
  style,
  ...props
}: IconProps): React.ReactElement {
  const optimizedStyle: React.CSSProperties = {
    shapeRendering: 'geometricPrecision',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...style,
  };

  return (
    <IconComponent
      className={cn(sizeClasses[size], className)}
      strokeWidth={strokeWidth}
      style={optimizedStyle}
      {...props}
    />
  );
}

/**
 * High-fidelity navbar icon with consistent styling
 */
export function NavIcon({
  icon,
  className,
  ...props
}: Omit<IconProps, 'size'> & { size?: never }): React.ReactElement {
  return (
    <Icon
      icon={icon}
      size="md"
      className={cn(
        'text-primary group-hover:text-primary/80 transition-colors duration-200',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Small action icon for buttons and controls
 */
export function ActionIcon({
  icon,
  className,
  ...props
}: Omit<IconProps, 'size'> & { size?: never }): React.ReactElement {
  return (
    <Icon icon={icon} size="sm" {...(className && { className })} {...props} />
  );
}
