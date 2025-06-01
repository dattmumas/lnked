'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/primitives/Button';
import type { CollectiveSummary } from './DashboardShell';
import { SidebarNav } from './SidebarNav';

interface DashboardSidebarProps {
  className?: string;
  collectives: CollectiveSummary[];
  collapsed?: boolean;
}

export function DashboardSidebar({
  className,
  collectives,
  collapsed = false,
}: DashboardSidebarProps) {
  return (
    <aside
      className={cn(
        'bg-surface-elevated-1 text-content-primary flex flex-col',
        'border-r border-border-subtle h-full transition-all transition-normal overflow-y-auto',
        'shadow-sm backdrop-blur-sm',
        collapsed ? 'w-16' : 'w-64 p-card-md',
        className,
      )}
      aria-label="Dashboard sidebar"
    >
      <div
        className={cn(
          'mb-section flex items-center',
          collapsed ? 'justify-center mb-component' : 'gap-component',
        )}
      ></div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav collectives={collectives} collapsed={collapsed} />
      </div>

      <div
        className={cn(
          'mt-auto flex justify-center border-t border-border-subtle pt-component',
          collapsed ? 'px-0' : 'px-0',
        )}
      >
        {collapsed ? (
          <Button
            variant="default"
            size="icon"
            className="micro-interaction btn-scale rounded-lg"
            asChild
          >
            <Link href="/posts/new">
              <Plus className="h-5 w-5" aria-label="Create Post" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="w-full micro-interaction btn-scale"
            asChild
          >
            <Link
              href="/posts/new"
              className="flex items-center justify-center gap-2"
            >
              <Plus className="size-4" />
              Create Post
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
