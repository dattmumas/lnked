'use client';

import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantStore } from '@/stores/tenant-store';
import { getOptimizedAvatarUrl } from '@/lib/utils/avatar';
import { useUser } from '@/providers/UserContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function PublicNavBar(): React.ReactElement {
  const { user, profile } = useUser();
  const router = useRouter();
  const clearTenantState = useTenantStore((state) => state.actions.clear);

  const handleSignOut = useCallback(async (): Promise<void> => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    await clearTenantState();
    router.push('/');
  }, [router, clearTenantState]);

  // 🎓 Context-Aware Navigation: Shows different content based on auth state
  // This eliminates the "logged out" appearance on public pages when user is authenticated

  return (
    <header className="w-full border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link
          href="/home"
          className="text-lg font-semibold text-foreground hover:text-accent transition-colors"
        >
          NewPaper
        </Link>

        {/* Auth-aware Navigation */}
        <nav>
          {user ? (
            // 🎓 Authenticated User: Show user avatar with dropdown
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getOptimizedAvatarUrl(
                        profile?.avatar_url ?? undefined,
                        {
                          width: 32,
                          height: 32,
                        },
                      )}
                      alt={profile?.username ?? ''}
                    />
                    <AvatarFallback>
                      {(
                        profile?.full_name?.[0] ??
                        user?.email?.[0] ??
                        'U'
                      ).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.full_name ?? user.email}
                    </p>
                    {profile?.username && (
                      <p className="text-xs leading-none text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/home">
                    <User className="mr-2 h-4 w-4" />
                    <span>Go to App</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // 🎓 Unauthenticated User: Show sign-in button
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Sign&nbsp;in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
