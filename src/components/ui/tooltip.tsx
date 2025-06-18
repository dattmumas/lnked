'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Constants
const DEFAULT_SIDE_OFFSET = 4;

// Type assertion to work around React 19 compatibility issues
const TooltipPrimitiveTyped = TooltipPrimitive as any;

const TooltipProvider = TooltipPrimitiveTyped.Provider;

const Tooltip = TooltipPrimitiveTyped.Root;

const TooltipTrigger = TooltipPrimitiveTyped.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitiveTyped.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitiveTyped.Content>
>(({ className, sideOffset = DEFAULT_SIDE_OFFSET, ...props }, ref) => (
  <TooltipPrimitiveTyped.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitiveTyped.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/no-unsafe-argument */
