'use client';

import { Home, Compass, Video, Bell, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  matchExact?: boolean;
}

const navItems: NavItem[] = [
  { href: '/home', icon: Home, label: 'Home', matchExact: true },
  { href: '/discover', icon: Compass, label: 'Explore' },
  { href: '/videos', icon: Video, label: 'Videos' },
  { href: '/notifications', icon: Bell, label: 'Alerts' },
  { href: '/profile', icon: UserIcon, label: 'Profile' },
];

export default function MobileBottomNav(): React.ReactElement {
  const pathname = usePathname();

  const isActive = (item: NavItem): boolean => {
    if (item.matchExact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 text-xs flex-1',
              active
                ? 'text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
