'use client';

import {
  LayoutDashboard,
  FileText,
  Users2,
  Settings as SettingsIcon,
  ArrowUpRight,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { SidebarLink } from './SidebarLink';
import type { CollectiveSummary } from './DashboardShell';

interface SidebarNavProps {
  collectives: CollectiveSummary[];
  collapsed?: boolean;
}

const mainNavItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Overview',
  },
  {
    href: '/dashboard/posts',
    icon: FileText,
    label: 'My Posts',
  },
  {
    href: '/dashboard/video-management',
    icon: Video,
    label: 'Video Management',
  },
];

const settingsNavItems = [
  {
    href: '/dashboard/settings',
    icon: SettingsIcon,
    label: 'Settings',
  },
];

export function SidebarNav({
  collectives,
  collapsed = false,
}: SidebarNavProps) {
  return (
    <div className={collapsed ? 'space-y-2 px-0' : 'space-y-6 px-2'}>
      {/* Main section */}
      <nav
        className={
          collapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-1'
        }
        aria-label={collapsed ? 'Collapsed Main' : 'Main'}
      >
        {mainNavItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            exact={item.href === '/dashboard'}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Collectives section */}
      <div>
        {!collapsed && (
          <div className="px-3 py-2 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider font-medium text-sidebar-foreground/60">
              Collectives
            </h2>
          </div>
        )}
        <nav
          className={
            collapsed
              ? 'flex flex-col items-center gap-2'
              : 'flex flex-col gap-1'
          }
          aria-label={collapsed ? 'Collapsed Collectives' : 'Collectives'}
        >
          {collectives.length === 0
            ? !collapsed && (
                <span className="text-xs text-muted-foreground px-3 py-1">
                  No collectives
                </span>
              )
            : collectives.map((col) =>
                collapsed ? (
                  <SidebarLink
                    key={col.id}
                    href={`/dashboard/collectives/${col.id}`}
                    icon={Users2}
                    label={col.name}
                    collapsed
                  />
                ) : (
                  <div
                    key={col.id}
                    className="flex items-center justify-between pr-2"
                  >
                    <SidebarLink
                      href={`/dashboard/collectives/${col.id}`}
                      icon={Users2}
                      label={col.name}
                    />
                    <Link
                      href={`/${col.slug}`}
                      className="text-muted-foreground hover:text-accent"
                      aria-label={`View ${col.name}`}
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                ),
              )}
        </nav>
      </div>

      {/* Settings section */}
      <div>
        {!collapsed && (
          <div className="px-3 py-2">
            <h2 className="text-xs uppercase tracking-wider font-medium text-sidebar-foreground/60">
              Settings
            </h2>
          </div>
        )}
        <nav
          className={
            collapsed
              ? 'flex flex-col items-center gap-2'
              : 'flex flex-col gap-1'
          }
          aria-label={collapsed ? 'Collapsed Settings' : 'Settings'}
        >
          {settingsNavItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
