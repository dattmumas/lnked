'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Compass,
  BookOpen,
  User as UserIcon,
  Settings,
  Edit,
  Video,
} from 'lucide-react';

const navigationItems = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Compass, label: 'Explore', href: '/discover' },
  {
    icon: BookOpen,
    label: 'Subscriptions',
    href: '/dashboard/my-newsletter/subscribers',
  },
  { icon: UserIcon, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

// Create content navigation items
const createContentItems = [
  { icon: Edit, label: 'New Post', href: '/posts/new' },
  { icon: Video, label: 'Upload Video', href: '/videos/upload' },
  { icon: Video, label: 'Video Library', href: '/dashboard/video-management' },
];

export default function GlobalSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

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
    if (href === '/dashboard/my-newsletter/subscribers') {
      return pathname.startsWith('/dashboard/my-newsletter');
    }
    if (href === '/dashboard/video-management') {
      return pathname === '/dashboard/video-management';
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-16 bottom-0 z-30 transition-all duration-300 ease-in-out',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-r border-gray-200/50 dark:border-gray-700/50',
        isExpanded ? 'w-48' : 'w-16',
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="h-full flex flex-col">
        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-2">
          {navigationItems.map((item, index) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-gray-100/70 dark:hover:bg-gray-800/70',
                  isActive &&
                    'bg-blue-50/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                )}
                style={{
                  transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
                }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
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
        </nav>

        {/* Separator */}
        <div className="px-6 py-2">
          <div
            className={cn(
              'border-t border-gray-200 dark:border-gray-700 transition-all duration-200',
              isExpanded ? 'opacity-100' : 'opacity-50',
            )}
          ></div>
        </div>

        {/* Create Content Section */}
        <div className="p-3 pb-6">
          <div
            className={cn(
              'px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-all duration-200',
              isExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2',
            )}
          >
            Create
          </div>
          <div className="space-y-2">
            {createContentItems.map((item, index) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-green-50/70 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300',
                    'hover:text-green-600 dark:hover:text-green-400',
                    isActive &&
                      'bg-green-50/70 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                  )}
                  style={{
                    transitionDelay: isExpanded
                      ? `${(navigationItems.length + index) * 50}ms`
                      : '0ms',
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
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
        </div>
      </div>
    </div>
  );
}
