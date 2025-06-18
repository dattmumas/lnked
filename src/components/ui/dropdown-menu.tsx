'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Default offset between trigger and content
const DEFAULT_SIDE_OFFSET = 4;

// Extract components with type assertion to handle module resolution issues
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const {
  Root: DropdownMenu,
  Trigger: DropdownMenuTrigger,
  Portal: DropdownMenuPortal,
  Content: DropdownMenuPrimitiveContent,
  Item: DropdownMenuPrimitiveItem,
  Separator: DropdownMenuPrimitiveSeparator,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} = DropdownMenuPrimitive as any;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveContent>
>(({ className, sideOffset = DEFAULT_SIDE_OFFSET, ...props }, ref) => (
  <DropdownMenuPortal>
    {/* eslint-disable @typescript-eslint/no-unsafe-assignment */}
    <DropdownMenuPrimitiveContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border shadow-md bg-white dark:bg-gray-900',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        className,
      )}
      {...props}
    />
    {/* eslint-enable @typescript-eslint/no-unsafe-assignment */}
  </DropdownMenuPortal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveItem>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none bg-background',
      'focus:bg-accent focus:text-accent-foreground',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitiveSeparator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveSeparator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveSeparator
    ref={ref}
    className={cn(
      'bg-border my-1 h-px bg-background',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      className,
    )}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
