import * as React from "react";
import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleProps
  extends React.ComponentProps<typeof RadixCollapsible.Root> {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

function Collapsible({
  children,
  className,
  defaultOpen,
  ...props
}: CollapsibleProps) {
  return (
    <RadixCollapsible.Root className={className} open={defaultOpen} {...props}>
      {children}
    </RadixCollapsible.Root>
  );
}

interface CollapsibleTriggerProps
  extends React.ComponentProps<typeof RadixCollapsible.Trigger> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  className?: string;
}

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ icon, title, className, children, ...props }, ref) => (
  <RadixCollapsible.Trigger
    ref={ref}
    className={cn(
      "flex items-center justify-between w-full px-4 py-2 bg-muted rounded-lg border border-border cursor-pointer transition-colors hover:bg-muted/70 group",
      className
    )}
    {...props}
  >
    <span className="flex items-center gap-2">
      {icon && <span className="text-primary">{icon}</span>}
      <span className="font-serif text-2xl font-semibold text-foreground">
        {title}
      </span>
    </span>
    <ChevronDown
      className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
      data-state={props["data-state"]}
    />
  </RadixCollapsible.Trigger>
));
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RadixCollapsible.Content>
>(({ className, children, ...props }, ref) => (
  <RadixCollapsible.Content
    ref={ref}
    className={cn(
      "pt-2 w-full data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    {children}
  </RadixCollapsible.Content>
));
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
