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
  Menu,
  LayoutDashboard,
  FileText,
  Users2,
  UserSquare,
  Newspaper,
  LogOut,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import ModeToggle from '@/components/app/nav/ModeToggle';

const dashboardNavItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: <LayoutDashboard className="size-4" />,
  },
  {
    href: '/dashboard/posts',
    label: 'My Posts',
    icon: <FileText className="size-4" />,
  },
  {
    href: '/dashboard/collectives',
    label: 'My Collectives',
    icon: <Users2 className="size-4" />,
  },
  {
    href: '/dashboard/profile/edit',
    label: 'Edit Profile',
    icon: <UserSquare className="size-4" />,
  },
  {
    href: '/dashboard/settings',
    label: 'Account Settings',
    icon: <Settings className="size-4" />,
  },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch current user using shared Supabase client
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
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push('/'); // Redirect to home or sign-in page after sign out
    setIsLoading(false);
  };

  // Hide Navbar on auth pages or specific routes if desired
  if (pathname === '/sign-in' || pathname === '/sign-up') {
    return null;
  }

  const isDashboardPath = pathname.startsWith('/dashboard');

  return (
    <nav
      className="flex items-center justify-end gap-2 md:gap-4"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="hidden md:flex items-center gap-2">
        {isLoading ? (
          <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
        ) : user ? (
          <>
            <Button
              variant={pathname === '/discover' ? 'secondary' : 'ghost'}
              size="sm"
              aria-current={pathname === '/discover' ? 'page' : undefined}
              onClick={() => router.push('/discover')}
            >
              Discover
            </Button>
            <Button
              variant={isDashboardPath ? 'secondary' : 'ghost'}
              size="sm"
              aria-current={isDashboardPath ? 'page' : undefined}
              onClick={() => router.push('/dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant={
                pathname === `/@${username}` ? 'secondary' : 'ghost'
              }
              size="sm"
              aria-current={
                pathname === `/@${username}` ? 'page' : undefined
              }
              onClick={() => router.push(`/@${username ?? user?.id}`)}
            >
              <UserIcon className="size-4 mr-2" /> My Profile
            </Button>
            <Button
              variant={pathname === '/dashboard/settings' ? 'secondary' : 'ghost'}
              size="sm"
              aria-current={pathname === '/dashboard/settings' ? 'page' : undefined}
              onClick={() => router.push('/dashboard/settings')}
            >
              Account Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isLoading}
            >
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sign-in')}
            >
              Sign In
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/sign-up')}
            >
              Sign Up
            </Button>
          </>
        )}
        <ModeToggle />
      </div>

      {/* Mobile menu */}
      <div className="md:hidden flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-4 w-[250px] sm:w-[300px]">
            <SheetTitle className="mb-4">
              <Link href="/" className="text-xl font-bold text-primary">
                Lnked
              </Link>
            </SheetTitle>

            {isLoading ? (
              <div className="h-8 w-full bg-muted rounded animate-pulse mt-4" />
            ) : user ? (
              <div className="flex flex-col space-y-1">
                {isDashboardPath ? (
                  <>
                    {dashboardNavItems.map((item) => (
                      <Button
                        key={item.href}
                        variant={pathname === item.href ? 'secondary' : 'ghost'}
                        className="justify-start h-9 px-2"
                        aria-current={
                          pathname === item.href ? 'page' : undefined
                        }
                        onClick={() => router.push(item.href)}
                      >
                        <span className="mr-2">{item.icon}</span> {item.label}
                      </Button>
                    ))}
                    <Button
                      variant={
                        pathname === `/@${username}`
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="justify-start h-9 px-2"
                      aria-current={
                        pathname === `/@${username}` ? 'page' : undefined
                      }
                      onClick={() => router.push(`/@${username ?? user?.id}`)}
                    >
                      <UserIcon className="size-4 mr-2" /> My Profile
                    </Button>
                    <Button
                      variant={pathname === '/dashboard/settings' ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      aria-current={
                        pathname === '/dashboard/settings' ? 'page' : undefined
                      }
                      onClick={() => router.push('/dashboard/settings')}
                    >
                      <Settings className="size-4 mr-2" /> Account Settings
                    </Button>
                    <div className="my-2 h-px bg-border" />
                    <Button
                      variant={pathname === '/discover' ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      aria-current={
                        pathname === '/discover' ? 'page' : undefined
                      }
                      onClick={() => router.push('/discover')}
                    >
                      <Newspaper className="size-4 mr-2" /> Discover
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-9 px-2 mt-4"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-4 mr-2" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={pathname === '/discover' ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      aria-current={
                        pathname === '/discover' ? 'page' : undefined
                      }
                      onClick={() => router.push('/discover')}
                    >
                      <Newspaper className="size-4 mr-2" /> Discover
                    </Button>
                    <Button
                      variant={isDashboardPath ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      aria-current={isDashboardPath ? 'page' : undefined}
                      onClick={() => router.push('/dashboard')}
                    >
                      <LayoutDashboard className="size-4 mr-2" /> Dashboard
                    </Button>
                    <Button
                      variant={
                        pathname === `/@${username}`
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="justify-start h-9 px-2"
                      aria-current={
                        pathname === `/@${username}` ? 'page' : undefined
                      }
                      onClick={() => router.push(`/@${username ?? user?.id}`)}
                    >
                      <UserIcon className="size-4 mr-2" /> My Profile
                    </Button>
                    <Button
                      variant={pathname === '/dashboard/settings' ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      aria-current={
                        pathname === '/dashboard/settings' ? 'page' : undefined
                      }
                      onClick={() => router.push('/dashboard/settings')}
                    >
                      <Settings className="size-4 mr-2" /> Account Settings
                    </Button>
                    <div className="my-2 h-px bg-border" />
                    <Button
                      variant="outline"
                      className="justify-start h-9 px-2 mt-4"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-4 mr-2" /> Sign Out
                    </Button>
                  </>
                )}
                <div className="mt-4 flex justify-center">
                  <ModeToggle />
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <Button
                  variant="ghost"
                  className="justify-start h-9 px-2"
                  onClick={() => router.push('/sign-in')}
                >
                  Sign In
                </Button>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => router.push('/sign-up')}
                >
                  Sign Up
                </Button>
                <div className="mt-4 flex justify-center">
                  <ModeToggle />
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
