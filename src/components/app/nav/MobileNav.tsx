'use client';

import {
  Menu,
  Compass,
  Video,
  FileText,
  User as UserIcon,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils/cn';
import { useUser } from '@/providers/UserContext';

const navItems = [
  { href: '/discover', label: 'Explore', icon: Compass },
  { href: '/videos', label: 'Videos', icon: Video },
  { href: '/posts', label: 'Posts', icon: FileText },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav(): React.ReactElement {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { profile } = useUser();

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="pr-0 w-full sm:w-[90%] data-[state=open]:animate-in"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* User Row */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
          <Avatar className="h-10 w-10">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? ''}
              />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate max-w-[120px]">
              {profile?.full_name ?? 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              @{profile?.username ?? 'user'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto p-2 rounded-md hover:bg-muted focus:outline-none"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col mt-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-4 h-12 transition-colors',
                pathname.startsWith(item.href)
                  ? 'font-semibold text-foreground border-l-4 border-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
