import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of the card affecting padding
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Makes the card interactive with hover states
   * @default false
   */
  interactive?: boolean;
  /**
   * Adds elevation with shadow effects
   * @default false
   */
  elevated?: boolean;
  /**
   * Render as a different element
   * @default 'div'
   */
  as?: React.ElementType;
}

/**
 * Base Card component implementing the hybrid semantic system.
 * Provides flexible foundation for MetricCard, ContentCard, and custom variants.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      size = 'md',
      interactive = false,
      elevated = false,
      as: Component = 'div',
      children,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: 'p-card-sm', // 12px padding
      md: 'p-card-md', // 24px padding
      lg: 'p-card-lg', // 32px padding
    };

    return (
      <Component
        ref={ref}
        className={cn(
          // Base card styling using pattern component
          'pattern-card',
          // Size-based padding using semantic tokens
          sizeClasses[size],
          // Interactive hover states
          interactive && 'pattern-card-interactive micro-interaction',
          // Elevated shadow effects
          elevated && 'pattern-card-elevated',
          // Custom className override
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Card.displayName = 'Card';

// Card Header component for consistent card structure
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 mb-4', className)}
      {...props}
    />
  ),
);

CardHeader.displayName = 'CardHeader';

// Card Title component
export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-content-primary',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
);

CardTitle.displayName = 'CardTitle';

// Card Description component
export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-content-secondary', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

// Card Content component
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-content-primary', className)}
      {...props}
    />
  ),
);

CardContent.displayName = 'CardContent';

// Card Footer component
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-component mt-4', className)}
      {...props}
    />
  ),
);

CardFooter.displayName = 'CardFooter';
