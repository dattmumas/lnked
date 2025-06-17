'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import type { ElementType } from 'react';

// Type assertion to work around React 19 compatibility
interface TooltipComponents {
  Root: React.FC<{ children: React.ReactNode; delayDuration?: number }>;
  Trigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>;
  Content: React.FC<{
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    className?: string;
  }>;
}
const Tooltip = TooltipPrimitive as TooltipComponents;

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
              'flex items-center justify-center p-component rounded-lg transition-all transition-fast',
              'micro-interaction nav-hover',
              isActive
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-content-secondary hover:text-content-primary hover:bg-interaction-hover',
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
          className="z-50 px-component py-1 rounded-md bg-surface-elevated-2 text-content-primary text-xs shadow-lg border border-border-subtle backdrop-blur-sm"
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
        'flex items-center gap-component px-component py-component text-sm font-medium rounded-lg',
        'transition-all transition-fast micro-interaction nav-hover',
        'group relative overflow-hidden',
        isActive
          ? 'bg-accent/20 text-accent font-semibold'
          : 'text-content-secondary hover:text-content-primary hover:bg-interaction-hover',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {Icon && (
        <Icon
          className={cn(
            'size-4 shrink-0 transition-transform transition-fast',
            'group-hover:scale-110',
            isActive ? 'text-accent' : '',
          )}
        />
      )}
      <span className="truncate">{label}</span>

      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent rounded-r-full" />
      )}
    </Link>
  );
}
