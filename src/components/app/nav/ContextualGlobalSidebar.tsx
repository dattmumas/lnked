'use client';

import { Compass, Video, User as UserIcon, Settings, Edit } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useState, useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { useTenantStore } from '@/stores/tenant-store';

// Constants
const MOUSE_LEAVE_DELAY = 200;
const TRANSITION_DELAY_MULTIPLIER = 50;

export function ContextualGlobalSidebar(): React.ReactElement | undefined {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(
    undefined,
  );
  const pathname = usePathname();
  const { currentTenant } = useTenantStore();

  const settingsLink =
    currentTenant?.type === 'collective'
      ? `/settings/collectives/${currentTenant.slug}`
      : '/settings/user';

  const profileLink =
    currentTenant?.type === 'collective'
      ? `/collectives/${currentTenant.slug}`
      : '/profile';

  const navigationItems = [
    { icon: Compass, label: 'Explore', href: '/discover' },
    { icon: Video, label: 'Videos', href: '/videos' },
    { icon: UserIcon, label: 'Profile', href: profileLink },
    { icon: Settings, label: 'Settings', href: settingsLink },
  ];

  const actionItems = [
    { icon: Edit, label: 'Write Post', href: '/posts/new', variant: 'primary' },
    {
      icon: Video,
      label: 'Video Post',
      href: '/posts/new/video',
      variant: 'primary',
    },
  ];

  // ... (the rest of the component remains the same, but with navigationItems updated)
  // I will fill in the rest of the component logic below.

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

  const isActiveRoute = useCallback(
    (href: string): boolean => {
      if (href.startsWith('/profile') || href.startsWith('/collectives/')) {
        return (
          pathname.startsWith('/profile') ||
          pathname.startsWith('/collectives/')
        );
      }
      if (href.startsWith('/settings')) {
        return pathname.startsWith('/settings');
      }
      if (href === '/videos') {
        return pathname === '/videos' || pathname.startsWith('/videos/');
      }
      return pathname.startsWith(href);
    },
    [pathname],
  );

  useEffect(() => {
    return (): void => {
      if (hoverTimeout !== undefined) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  // Hide sidebar entirely on the dedicated chat interface
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
    <nav
      className={cn(
        'fixed left-0 top-16 bottom-0 z-30 transition-all duration-200 ease-in-out',
        'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-border',
        isExpanded ? 'w-64' : 'w-16',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Main navigation"
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 p-3">
          <ul className="space-y-1">
            {navigationItems.map((item, index) => {
              const isActive = isActiveRoute(item.href);
              return (
                <li key={item.href}>
                  <Link
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
                </li>
              );
            })}
          </ul>
        </div>

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
    </nav>
  );
}
