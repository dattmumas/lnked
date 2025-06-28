'use client';

import {
  Compass,
  Video,
  User as UserIcon,
  Settings,
  Edit,
  ChevronDown,
  ChevronRight,
  Users,
  Plus,
  FileText,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useState, useEffect } from 'react';

import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

import { CollectivesTableModal } from './CollectivesTableModal';

// Constants
const MOUSE_LEAVE_DELAY = 200;
const TRANSITION_DELAY_MULTIPLIER = 50;

// Enhanced main navigation with Videos moved up as per creative design
const navigationItems = [
  { icon: Compass, label: 'Explore', href: '/discover' },
  { icon: Video, label: 'Videos', href: '/videos' },
  { icon: FileText, label: 'Posts', href: '/dashboard/posts' },
  { icon: UserIcon, label: 'Profile', href: '/profile' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

// Dual action buttons as per creative design
const actionItems = [
  { icon: Edit, label: 'Write Post', href: '/posts/new', variant: 'primary' },
  {
    icon: Video,
    label: 'Upload Video',
    href: '/videos/upload',
    variant: 'primary',
  },
];

// Collective interface for type safety
interface Collective {
  id: string;
  name: string;
  slug: string;
  member_count?: number;
}

export function GlobalSidebar(): React.ReactElement | undefined {
  const [isExpanded, setIsExpanded] = useState(false);
  const [collectivesExpanded, setCollectivesExpanded] = useState(false);
  const [collectivesModalOpen, setCollectivesModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(
    undefined,
  );
  const pathname = usePathname();

  // Defensive authentication check
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user && !error));
    };

    void checkAuth();
  }, []);

  // Use existing hook to fetch user's collectives (include non-postable for navigation)
  const { data: collectives = [], isLoading: loading } =
    useCollectiveMemberships(true) as {
      data: Collective[];
      isLoading: boolean;
    };

  // Auto-expand when hovering with smooth delay
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | undefined>(
    undefined,
  );

  const handleMouseEnter = useCallback((): void => {
    if (hoverTimeout !== undefined) clearTimeout(hoverTimeout);
    setIsExpanded(true);
  }, [hoverTimeout]);

  const handleMouseLeave = useCallback((): void => {
    const timeout = setTimeout(() => setIsExpanded(false), MOUSE_LEAVE_DELAY);
    setHoverTimeout(timeout);
  }, []);

  const handleCollectivesToggle = useCallback((): void => {
    setCollectivesExpanded(!collectivesExpanded);
  }, [collectivesExpanded]);

  const isActiveRoute = useCallback(
    (href: string): boolean => {
      if (href === '/profile') {
        return pathname.startsWith('/profile');
      }
      if (href === '/settings') {
        return pathname.startsWith('/settings');
      }
      if (href === '/videos') {
        return pathname === '/videos' || pathname.startsWith('/videos/');
      }
      return pathname.startsWith(href);
    },
    [pathname],
  );

  const isCollectiveActive = useCallback(
    (slug: string): boolean => {
      return pathname.includes(`/collectives/${slug}`);
    },
    [pathname],
  );

  useEffect(() => {
    return (): void => {
      if (hoverTimeout !== undefined) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  // Hide sidebar entirely on the dedicated chat interface to provide a cleaner UI
  // This check must come after all hooks to avoid React hooks errors
  if (pathname.startsWith('/chat')) {
    return undefined;
  }

  // Don't render until authentication is verified
  if (isAuthenticated === undefined) {
    return undefined; // Loading state
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return undefined;
  }

  return (
    <div
      className={cn(
        'fixed left-0 top-16 bottom-0 z-30 transition-all duration-200 ease-in-out',
        'bg-background backdrop-blur-md border-r border-border',
        isExpanded ? 'w-64' : 'w-16',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="h-full flex flex-col">
        {/* Main Navigation Section */}
        <nav className="flex-1 p-3" role="list">
          <div className="space-y-1">
            {navigationItems.map((item, index) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
                    isActive && 'bg-accent text-accent-foreground',
                  )}
                  style={{
                    transitionDelay: isExpanded
                      ? `${index * TRANSITION_DELAY_MULTIPLIER}ms`
                      : '0ms',
                  }}
                  role="listitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon
                    className="w-5 h-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'font-medium transition-all duration-200',
                      isExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collectives Section with Toggleable Submenu */}
        <div className="px-3 border-t border-border">
          <button
            onClick={handleCollectivesToggle}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-3 py-2.5 mt-3 rounded-lg transition-all duration-200',
              'hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
              'text-sm font-medium text-muted-foreground hover:text-foreground',
            )}
            aria-expanded={collectivesExpanded}
            aria-controls="collectives-submenu"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span
                className={cn(
                  'transition-all duration-200',
                  isExpanded
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-2',
                )}
              >
                Collectives{' '}
                {collectives.length > 0 && `(${collectives.length})`}
              </span>
            </div>
            {isExpanded && (
              <div className="transition-transform duration-200">
                {collectivesExpanded ? (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                )}
              </div>
            )}
          </button>

          {/* Collectives Submenu */}
          <div
            id="collectives-submenu"
            className={cn(
              'overflow-hidden transition-all duration-200',
              collectivesExpanded && isExpanded
                ? 'max-h-60 opacity-100'
                : 'max-h-0 opacity-0',
            )}
            role="group"
            aria-labelledby="collectives-toggle"
          >
            <div className="pl-8 pr-3 pb-2 space-y-1">
              {loading ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <>
                  {/* "All" button - always show if we have collectives */}
                  {collectives.length > 0 && (
                    <button
                      onClick={() => setCollectivesModalOpen(true)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200',
                        'text-sm font-medium hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
                        'w-full text-left',
                      )}
                    >
                      <span>All Collectives</span>
                    </button>
                  )}

                  {/* Individual collective links */}
                  {collectives.length > 0 ? (
                    collectives.map((collective) => (
                      <Link
                        key={collective.id}
                        href={`/collectives/${collective.slug}`}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200',
                          'text-sm hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
                          isCollectiveActive(collective.slug) &&
                            'bg-accent text-accent-foreground',
                        )}
                        aria-current={
                          isCollectiveActive(collective.slug)
                            ? 'page'
                            : undefined
                        }
                      >
                        <span className="truncate" title={collective.name}>
                          {collective.name}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No collectives yet
                    </div>
                  )}

                  {/* Create new collective link */}
                  <Link
                    href="/collectives/new"
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200',
                      'text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      'focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
                    )}
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    <span>Create Collective</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dual Action Buttons Section */}
        <div className="p-3 border-t border-border">
          <div className="space-y-2">
            {actionItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  item.variant === 'primary'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  !isExpanded && 'justify-center',
                )}
                style={{
                  transitionDelay: isExpanded
                    ? `${index * TRANSITION_DELAY_MULTIPLIER}ms`
                    : '0ms',
                }}
                role="button"
                aria-label={item.label}
              >
                <item.icon
                  className="w-5 h-5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'font-medium transition-all duration-200',
                    isExpanded
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-2 sr-only',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Collectives Table Modal */}
      <CollectivesTableModal
        open={collectivesModalOpen}
        onOpenChange={setCollectivesModalOpen}
      />
    </div>
  );
}
