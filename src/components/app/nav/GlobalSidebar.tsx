'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  Home,
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

// Enhanced main navigation with Videos moved up as per creative design
const navigationItems = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Compass, label: 'Explore', href: '/discover' },
  { icon: Video, label: 'Videos', href: '/videos' },
  { icon: FileText, label: 'Posts', href: '/dashboard/posts' },
  { icon: UserIcon, label: 'Profile', href: '/profile' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
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

export default function GlobalSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [collectivesExpanded, setCollectivesExpanded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();

  // Defensive authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!(user && !error));
    };

    checkAuth();
  }, []);

  // Use existing hook to fetch user's collectives (include non-postable for navigation)
  const { data: collectives = [], isLoading: loading } =
    useCollectiveMemberships(true);

  // Auto-expand when hovering with smooth delay
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => setIsExpanded(false), 200);
    setHoverTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  // Don't render until authentication is verified
  if (isAuthenticated === null) {
    return null; // Loading state
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isActiveRoute = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/';
    }
    if (href === '/profile') {
      return pathname.startsWith('/profile');
    }
    if (href === '/dashboard/settings') {
      return pathname === '/dashboard/settings';
    }
    if (href === '/videos') {
      return pathname === '/videos' || pathname.startsWith('/videos/');
    }
    return pathname.startsWith(href);
  };

  const isCollectiveActive = (slug: string) => {
    return pathname.includes(`/collectives/${slug}`);
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-16 bottom-0 z-30 transition-all duration-200 ease-in-out',
        'bg-background/80 dark:bg-background/80 backdrop-blur-md border-r border-border',
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
                    transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
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
            onClick={() => setCollectivesExpanded(!collectivesExpanded)}
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
                ? 'max-h-48 opacity-100'
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
              ) : collectives.length > 0 ? (
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
                      isCollectiveActive(collective.slug) ? 'page' : undefined
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
              <Link
                href="/dashboard/collectives/new"
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200',
                  'text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  'focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
                )}
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Create Collective</span>
              </Link>
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
                  transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
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
    </div>
  );
}
