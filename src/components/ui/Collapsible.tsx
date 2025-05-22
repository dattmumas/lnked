"use client";
import * as React from "react";
import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleProps
  extends React.ComponentProps<typeof RadixCollapsible.Root> {
  children: React.ReactNode;
  className?: string;
  /** start open? */
  defaultOpen?: boolean;
}

export function Collapsible({
  children,
  className,
  defaultOpen = true,
  ...props
}: CollapsibleProps) {
  return (
    <RadixCollapsible.Root
      className={className}
      defaultOpen={defaultOpen}
      {...props}
    >
      {children}
    </RadixCollapsible.Root>
  );
}

// Use a type alias to avoid interface merging issues
// and ensure 'title' is React.ReactNode
export type CollapsibleTriggerProps = React.ComponentProps<
  typeof RadixCollapsible.Trigger
> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
};

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ icon, title, className, ...props }, ref) => (
  <RadixCollapsible.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-2 transition-colors hover:bg-muted/70 group",
      className
    )}
    {...props}
  >
    <span className="flex items-center gap-2">
      {icon && <span className="text-accent">{icon}</span>}
      <span className="font-serif text-2xl font-semibold text-foreground">
        {title}
      </span>
    </span>
    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
  </RadixCollapsible.Trigger>
));
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RadixCollapsible.Content>
>(({ className, children, ...props }, ref) => (
  <RadixCollapsible.Content
    ref={ref}
    className={cn(
      "w-full pt-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    {children}
  </RadixCollapsible.Content>
));
CollapsibleContent.displayName = "CollapsibleContent";
