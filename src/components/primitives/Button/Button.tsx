import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base button styling with enhanced design tokens
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
    // Interactive states from design system
    'micro-interaction',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-accent text-accent-foreground btn-hover',
          'micro-interaction btn-scale',
        ],
        destructive: [
          'bg-destructive text-destructive-foreground',
          'hover:bg-destructive/90 micro-interaction btn-scale',
        ],
        outline: [
          'border border-border bg-background hover:bg-muted hover:text-foreground',
          'dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
          'micro-interaction',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          'micro-interaction btn-scale',
        ],
        ghost: ['hover:bg-muted hover:text-foreground', 'micro-interaction'],
        link: [
          'text-accent underline-offset-4 hover:underline',
          'transition-fast',
        ],
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as child element (using Radix Slot)
   * @default false
   */
  asChild?: boolean;
  /**
   * Loading state with spinner
   * @default false
   */
  loading?: boolean;
  /**
   * Icon to display before text
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display after text
   */
  rightIcon?: React.ReactNode;
}

/**
 * Enhanced Button component implementing the interactive states system.
 * Includes motion preferences, semantic variants, and accessibility features.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    // Disable button when loading
    const isDisabled = Boolean(disabled) || loading;

    // When using asChild, we need to ensure proper Slot usage
    if (asChild) {
      // For asChild, we expect children to be a single React element
      // Icons and loading states should be handled by the parent
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    // Regular button rendering with all features
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {Boolean(leftIcon) && !loading && (
          <span className="mr-1">{leftIcon}</span>
        )}

        {children}

        {Boolean(rightIcon) && !loading && (
          <span className="ml-1">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
