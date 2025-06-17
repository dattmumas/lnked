'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Type assertion to work around React 19 compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TooltipPrimitiveTyped = TooltipPrimitive as any;

const TooltipProvider = TooltipPrimitiveTyped.Provider;

const Tooltip = TooltipPrimitiveTyped.Root;

const TooltipTrigger = TooltipPrimitiveTyped.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitiveTyped.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitiveTyped.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
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
