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
    <div
      className={
        collapsed ? 'pattern-stack gap-component' : 'pattern-stack gap-section'
      }
    >
      {/* Main navigation section */}
      <nav
        className={
          collapsed
            ? 'flex flex-col items-center gap-component'
            : 'pattern-stack gap-1'
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

      {/* Collectives section with enhanced styling */}
      <div>
        {!collapsed && (
          <div className="px-component py-component flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider font-medium text-content-secondary">
              Collectives
            </h2>
          </div>
        )}
        <nav
          className={
            collapsed
              ? 'flex flex-col items-center gap-component'
              : 'pattern-stack gap-1'
          }
          aria-label={collapsed ? 'Collapsed Collectives' : 'Collectives'}
        >
          {collectives.length === 0
            ? !collapsed && (
                <div className="px-component py-1 text-xs text-content-secondary">
                  No collectives
                </div>
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
                    className="flex items-center justify-between pr-component group"
                  >
                    <SidebarLink
                      href={`/dashboard/collectives/${col.id}`}
                      icon={Users2}
                      label={col.name}
                    />
                    <Link
                      href={`/${col.slug}`}
                      className="text-content-secondary hover:text-content-accent transition-colors transition-fast micro-interaction opacity-0 group-hover:opacity-100"
                      aria-label={`View ${col.name}`}
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                ),
              )}
        </nav>
      </div>

      {/* Settings section with enhanced styling */}
      <div>
        {!collapsed && (
          <div className="px-component py-component">
            <h2 className="text-xs uppercase tracking-wider font-medium text-content-secondary">
              Settings
            </h2>
          </div>
        )}
        <nav
          className={
            collapsed
              ? 'flex flex-col items-center gap-component'
              : 'pattern-stack gap-1'
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
