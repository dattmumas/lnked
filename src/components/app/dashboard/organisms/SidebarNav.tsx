'use client';

import {
  LayoutDashboard,
  FileText,
  Users2,
  Settings as SettingsIcon,
  ArrowUpRight,
  Video,
  User,
  Plus,
  Upload,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SidebarLink } from './SidebarLink';
import type { CollectiveSummary } from './DashboardShell';

interface SidebarNavProps {
  collectives: CollectiveSummary[];
  collapsed?: boolean;
}

const mainNavItems = [
  {
    href: '/dashboard/profile/edit',
    icon: User,
    label: 'Profile',
  },
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
    href: '/videos',
    icon: Video,
    label: 'Videos',
  },
  {
    href: '/dashboard/collectives',
    icon: Users2,
    label: 'Collectives',
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
  const [collectivesExpanded, setCollectivesExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Main content area */}
      <div
        className={
          collapsed
            ? 'pattern-stack gap-component flex-1'
            : 'pattern-stack gap-section flex-1'
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
          {mainNavItems.map((item) => {
            // Handle collectives toggle in expanded mode
            if (item.href === '/dashboard/collectives' && !collapsed) {
              return (
                <div key={item.href}>
                  <div className="flex items-center">
                    <SidebarLink
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      exact={false}
                      collapsed={collapsed}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 ml-1"
                      onClick={() =>
                        setCollectivesExpanded(!collectivesExpanded)
                      }
                      aria-expanded={collectivesExpanded}
                      aria-label="Toggle collectives submenu"
                    >
                      {collectivesExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Collectives submenu */}
                  {collectivesExpanded && (
                    <div className="ml-6 mt-1 pattern-stack gap-1">
                      {collectives.length === 0 ? (
                        <div className="px-component py-1 text-xs text-content-secondary">
                          No collectives
                        </div>
                      ) : (
                        collectives.map((col) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                exact={item.href === '/dashboard'}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        {/* Collectives section for collapsed mode */}
        {collapsed && collectives.length > 0 && (
          <div>
            <nav
              className="flex flex-col items-center gap-component"
              aria-label="Collapsed Collectives"
            >
              {collectives.map((col) => (
                <SidebarLink
                  key={col.id}
                  href={`/dashboard/collectives/${col.id}`}
                  icon={Users2}
                  label={col.name}
                  collapsed
                />
              ))}
            </nav>
          </div>
        )}

        {/* Settings section */}
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

      {/* Persistent action buttons at bottom */}
      <div className={collapsed ? 'p-2' : 'p-4'}>
        {collapsed ? (
          <div className="flex flex-col items-center space-y-2">
            <Button size="icon" asChild aria-label="Create Post">
              <Link href="/posts/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="icon" asChild aria-label="Upload Video">
              <Link href="/videos/upload">
                <Upload className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2 w-full">
            <Button size="sm" asChild className="w-full">
              <Link href="/posts/new">
                <Plus className="h-4 w-4 mr-2" />
                Write Post
              </Link>
            </Button>
            <Button size="sm" asChild className="w-full">
              <Link href="/videos/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
