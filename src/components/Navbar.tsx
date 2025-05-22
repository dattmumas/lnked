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
      <nav className="flex items-center justify-end gap-2 md:gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Back</Link>
        </Button>
      </nav>
    );
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
              asChild
            >
              <Link
                href="/discover"
                aria-current={pathname === '/discover' ? 'page' : undefined}
              >
                Discover
              </Link>
            </Button>
            <Button
              variant={isDashboardPath ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link
                href="/dashboard"
                aria-current={isDashboardPath ? 'page' : undefined}
              >
                Dashboard
              </Link>
            </Button>
            <Button
              variant={
                pathname === `/profile/${username ?? user?.id}`
                  ? 'secondary'
                  : 'ghost'
              }
              size="sm"
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
                <UserIcon className="size-4 mr-2" /> My Profile
              </Link>
            </Button>
            <Button
              variant={
                pathname === '/dashboard/settings' ? 'secondary' : 'ghost'
              }
              size="sm"
              asChild
            >
              <Link
                href="/dashboard/settings"
                aria-current={
                  pathname === '/dashboard/settings' ? 'page' : undefined
                }
              >
                Account Settings
              </Link>
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
              <Link href="/" className="text-xl font-bold text-accent">
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
                        asChild
                      >
                        <Link
                          href={item.href}
                          aria-current={
                            pathname === item.href ? 'page' : undefined
                          }
                        >
                          <span className="mr-2">{item.icon}</span> {item.label}
                        </Link>
                      </Button>
                    ))}
                    <Button
                      variant={
                        pathname === `/profile/${username ?? user?.id}`
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="justify-start h-9 px-2"
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
                        <UserIcon className="size-4 mr-2" /> My Profile
                      </Link>
                    </Button>
                    <Button
                      variant={
                        pathname === '/dashboard/settings'
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="justify-start h-9 px-2"
                      asChild
                    >
                      <Link
                        href="/dashboard/settings"
                        aria-current={
                          pathname === '/dashboard/settings'
                            ? 'page'
                            : undefined
                        }
                      >
                        <Settings className="size-4 mr-2" /> Account Settings
                      </Link>
                    </Button>
                    <div className="my-2 h-px bg-border" />
                    <Button
                      variant={pathname === '/discover' ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      asChild
                    >
                      <Link
                        href="/discover"
                        aria-current={
                          pathname === '/discover' ? 'page' : undefined
                        }
                      >
                        <Newspaper className="size-4 mr-2" /> Discover
                      </Link>
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
                      asChild
                    >
                      <Link
                        href="/discover"
                        aria-current={
                          pathname === '/discover' ? 'page' : undefined
                        }
                      >
                        <Newspaper className="size-4 mr-2" /> Discover
                      </Link>
                    </Button>
                    <Button
                      variant={isDashboardPath ? 'secondary' : 'ghost'}
                      className="justify-start h-9 px-2"
                      asChild
                    >
                      <Link
                        href="/dashboard"
                        aria-current={isDashboardPath ? 'page' : undefined}
                      >
                        <LayoutDashboard className="size-4 mr-2" /> Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant={
                        pathname === `/profile/${username ?? user?.id}`
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="justify-start h-9 px-2"
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
                        <UserIcon className="size-4 mr-2" /> My Profile
                      </Link>
                    </Button>
                    <Button
                      variant={
                        pathname === '/dashboard/settings'
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="justify-start h-9 px-2"
                      asChild
                    >
                      <Link
                        href="/dashboard/settings"
                        aria-current={
                          pathname === '/dashboard/settings'
                            ? 'page'
                            : undefined
                        }
                      >
                        <Settings className="size-4 mr-2" /> Account Settings
                      </Link>
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
                  asChild
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="default" className="w-full" asChild>
                  <Link href="/sign-up">Sign Up</Link>
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
