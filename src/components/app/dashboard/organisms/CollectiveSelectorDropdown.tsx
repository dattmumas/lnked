"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { CollectiveSummary } from "./DashboardShell";

interface CollectiveSelectorDropdownProps {
  collectives: CollectiveSummary[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export function CollectiveSelectorDropdown({
  collectives,
  value,
  onChange,
}: CollectiveSelectorDropdownProps) {
  return (
    <Select.Root
      value={value ?? undefined}
      onValueChange={(v: string) => onChange(v)}
    >
      <Select.Trigger
        className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Select collective"
      >
        <Select.Value placeholder="All Collectives" />
        <Select.Icon>
          <ChevronDown className="size-4 ml-1" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 min-w-[180px] rounded-md bg-popover shadow-lg border border-border py-1">
          <Select.Viewport>
            {collectives.map((col) => (
              <Select.Item
                key={col.id}
                value={col.id}
                className="flex items-center px-3 py-1.5 text-sm cursor-pointer select-none outline-none data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground hover:bg-muted"
              >
                <Select.ItemText>{col.name}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="size-4 ml-auto text-accent" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
