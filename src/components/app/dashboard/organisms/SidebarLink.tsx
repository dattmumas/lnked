'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface SidebarLinkProps {
  href: string;
  icon?: ElementType;
  label: string;
  exact?: boolean;
  collapsed?: boolean;
}

export function SidebarLink({
  href,
  icon: Icon,
  label,
  exact = false,
  collapsed = false,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  if (collapsed) {
    return (
      <Tooltip.Root delayDuration={200}>
        <Tooltip.Trigger asChild>
          <Link
            href={href}
            className={cn(
              'flex items-center justify-center p-2 rounded-md transition-colors',
              isActive
                ? 'bg-sidebar-accent/10 text-sidebar-accent'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/5 hover:text-sidebar-foreground',
            )}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && <Icon className="size-5" aria-hidden="true" />}
          </Link>
        </Tooltip.Trigger>
        <Tooltip.Content
          side="right"
          align="center"
          className="z-50 px-2 py-1 rounded bg-popover text-foreground text-xs shadow-md"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-sidebar-accent/10 text-sidebar-accent font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/5 hover:text-sidebar-foreground',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span>{label}</span>
    </Link>
  );
}
