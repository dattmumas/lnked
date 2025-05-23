'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase/browser';
import type { User, Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Menu,
  LayoutDashboard,
  FileText,
  Users2,
  User as UserIcon,
  Search,
  PenSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import ModeToggle from '@/components/app/nav/ModeToggle';

const mainNavItems = [
  {
    href: '/discover',
    label: 'Discover',
    icon: Search,
    description: 'Explore content',
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Your dashboard',
  },
  {
    href: '/posts/new',
    label: 'Create',
    icon: PenSquare,
    description: 'Create new post',
  },
];

const profileNavItems = [
  {
    href: '/dashboard/posts',
    label: 'My Posts',
    icon: FileText,
  },
  {
    href: '/dashboard/collectives',
    label: 'My Collectives',
    icon: Users2,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export interface NavbarProps {
  initialUser?: User | null;
  initialUsername?: string | null;
}

export default function Navbar({ initialUser, initialUsername }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [username, setUsername] = useState<string | null>(
    initialUsername ?? null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialUser === undefined,
  );

  useEffect(() => {
    if (initialUser === undefined) {
      // Fetch current user using shared Supabase client only when not provided
      supabase.auth
        .getUser()
        .then(async ({ data }: { data: { user: User | null } }) => {
          setUser(data.user);
          if (data.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('username')
              .eq('id', data.user.id)
              .single();
            setUsername(profile?.username ?? null);
          }
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    // Subscribe to auth changes on the singleton client
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('username')
            .eq('id', session.user.id)
            .single();
          setUsername(profile?.username ?? null);
        } else {
          setUsername(null);
        }
        // Sync session to server cookie on sign-in/sign-out
        fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, session }),
        });
      },
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [initialUser]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push('/'); // Redirect to home or sign-in page after sign out
    setIsLoading(false);
  };

  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';

  if (isAuthPage) {
    return (
      <nav className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Back</Link>
        </Button>
        <ModeToggle />
      </nav>
    );
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider>
      <nav
        className="flex items-center gap-1 md:gap-2"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {isLoading ? (
            <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
          ) : user ? (
            <>
              {/* Main navigation icons */}
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Tooltip key={item.href} delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="icon"
                        asChild
                        className="h-10 w-10"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={item.label}
                        >
                          <Icon className="size-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-sm">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              <div className="mx-1 h-6 w-px bg-border" />

              {/* Profile button */}
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      pathname === `/profile/${username ?? user?.id}`
                        ? 'secondary'
                        : 'ghost'
                    }
                    size="icon"
                    asChild
                    className="h-10 w-10"
                  >
                    <Link
                      href={`/profile/${username ?? user?.id}`}
                      aria-current={
                        pathname === `/profile/${username ?? user?.id}`
                          ? 'page'
                          : undefined
                      }
                      aria-label="My Profile"
                    >
                      <UserIcon className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-sm">
                  <p>My Profile</p>
                </TooltipContent>
              </Tooltip>

              {/* Settings button */}
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      pathname === '/dashboard/settings' ? 'secondary' : 'ghost'
                    }
                    size="icon"
                    asChild
                    className="h-10 w-10"
                  >
                    <Link
                      href="/dashboard/settings"
                      aria-current={
                        pathname === '/dashboard/settings' ? 'page' : undefined
                      }
                      aria-label="Settings"
                    >
                      <Settings className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-sm">
                  <p>Account Settings</p>
                </TooltipContent>
              </Tooltip>

              <div className="mx-1 h-6 w-px bg-border" />

              {/* Sign out button */}
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="h-10 w-10"
                    aria-label="Sign Out"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-sm">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
          <ModeToggle />
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <ModeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-4 w-[280px] sm:w-[320px]">
              <SheetTitle className="mb-6">
                <Link href="/" className="text-xl font-bold text-accent">
                  Lnked
                </Link>
              </SheetTitle>

              {isLoading ? (
                <div className="h-8 w-full bg-muted rounded animate-pulse mt-4" />
              ) : user ? (
                <div className="flex flex-col space-y-1">
                  {/* Main navigation */}
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? 'secondary' : 'ghost'}
                        className="justify-start h-11 px-3"
                        asChild
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="size-4 mr-3" />
                          {item.label}
                        </Link>
                      </Button>
                    );
                  })}

                  <div className="my-3 h-px bg-border" />

                  {/* Profile section */}
                  <Button
                    variant={
                      pathname === `/profile/${username ?? user?.id}`
                        ? 'secondary'
                        : 'ghost'
                    }
                    className="justify-start h-11 px-3"
                    asChild
                  >
                    <Link
                      href={`/profile/${username ?? user?.id}`}
                      aria-current={
                        pathname === `/profile/${username ?? user?.id}`
                          ? 'page'
                          : undefined
                      }
                    >
                      <UserIcon className="size-4 mr-3" />
                      My Profile
                    </Link>
                  </Button>

                  {/* Additional profile items */}
                  {profileNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? 'secondary' : 'ghost'}
                        className="justify-start h-11 px-3"
                        asChild
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="size-4 mr-3" />
                          {item.label}
                        </Link>
                      </Button>
                    );
                  })}

                  <div className="my-4 h-px bg-border" />

                  {/* Sign out */}
                  <Button
                    variant="outline"
                    className="justify-start h-11 px-3"
                    onClick={handleSignOut}
                    disabled={isLoading}
                  >
                    <LogOut className="size-4 mr-3" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  <Button
                    variant="ghost"
                    className="justify-start h-11"
                    asChild
                  >
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button variant="default" className="w-full h-11" asChild>
                    <Link href="/sign-up">Sign Up</Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </TooltipProvider>
  );
}
