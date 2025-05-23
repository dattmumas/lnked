'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User, Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  PenSquare,
  LayoutDashboard,
  FileText,
  User as UserIcon,
  Settings,
  LogOut,
  Bell,
  Compass,
  X,
  Search,
} from 'lucide-react';
import ModeToggle from '@/components/app/nav/ModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '@/components/app/nav/SearchBar';

const primaryNavItems = [
  {
    href: '/discover',
    label: 'Discover',
    icon: Compass,
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
];

const quickActions = [
  {
    href: '/posts/new',
    label: 'Write',
    icon: PenSquare,
    variant: 'default' as const,
  },
];

export interface ModernNavbarProps {
  initialUser?: User | null;
  initialUsername?: string | null;
}

export default function ModernNavbar({
  initialUser,
  initialUsername,
}: ModernNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [username, setUsername] = useState<string | null>(
    initialUsername ?? null,
  );
  const [userMetadata, setUserMetadata] = useState<{
    full_name?: string;
    avatar_url?: string;
  }>({});
  const [isLoading, setIsLoading] = useState<boolean>(
    initialUser === undefined,
  );
  const [notifications, setNotifications] = useState(3);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notificationList, setNotificationList] = useState([
    {
      id: '1',
      type: 'follower',
      title: 'New follower',
      message: 'John Doe started following you',
      time: '2m ago',
      color: 'bg-blue-500',
      read: false,
    },
    {
      id: '2',
      type: 'like',
      title: 'Post liked',
      message: 'Your post "Getting Started with Next.js" received 5 new likes',
      time: '1h ago',
      color: 'bg-green-500',
      read: false,
    },
    {
      id: '3',
      type: 'collaboration',
      title: 'Collaboration invite',
      message: 'You were invited to collaborate on "React Best Practices"',
      time: '3h ago',
      color: 'bg-purple-500',
      read: false,
    },
  ]);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (initialUser === undefined) {
      supabase.auth
        .getUser()
        .then(async ({ data }: { data: { user: User | null } }) => {
          setUser(data.user);
          if (data.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('username, full_name, avatar_url')
              .eq('id', data.user.id)
              .single();
            setUsername(profile?.username ?? null);
            setUserMetadata({
              full_name: profile?.full_name ?? undefined,
              avatar_url: profile?.avatar_url ?? undefined,
            });
          }
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('username, full_name, avatar_url')
            .eq('id', session.user.id)
            .single();
          setUsername(profile?.username ?? null);
          setUserMetadata({
            full_name: profile?.full_name ?? undefined,
            avatar_url: profile?.avatar_url ?? undefined,
          });
        } else {
          setUsername(null);
          setUserMetadata({});
        }

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
  }, [initialUser, supabase]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    setIsLoading(false);
  };

  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';

  // Handle notification dismissal
  const handleNotificationClick = () => {
    setNotifications(0);
    setNotificationList((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
  };

  // Handle individual notification dismissal
  const handleDismissNotification = (id: string) => {
    setNotificationList((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
    setNotifications((prev) => Math.max(0, prev - 1));
  };

  if (isAuthPage) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← Back</Link>
        </Button>
        <ModeToggle />
      </div>
    );
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const getUserInitials = () => {
    const name = userMetadata.full_name || username || user?.email;
    return name
      ? name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';
  };

  return (
    <nav>
      {/* Desktop Navigation */}
      <div>
        {/* Primary nav items */}
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(item.href);
          return (
            <Button
              key={item.href}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={item.href}>
                <Icon />
                {item.label}
              </Link>
            </Button>
          );
        })}

        {/* Search bar */}
        <div>
          <SearchBar />
        </div>
      </div>

      {/* User actions */}
      {isLoading ? (
        <div>
          <div />
          <div />
        </div>
      ) : user ? (
        <div>
          {/* Write button */}
          <Button variant="default" size="sm" asChild>
            <Link href="/posts/new">
              <PenSquare />
              Write
            </Link>
          </Button>

          {/* Search button for mobile/tablet */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/search')}
          >
            <Search />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Bell />
                {notifications > 0 && (
                  <Badge variant="destructive">{notifications}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div>
                <div>
                  <h3>Notifications</h3>
                  {notifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNotificationClick}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
              </div>

              {notifications > 0 ? (
                <div>
                  {notificationList.map((notification) => (
                    <DropdownMenuItem key={notification.id}>
                      <div>
                        <div className={notification.color} />
                        <span>{notification.title}</span>
                        <span>{notification.time}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissNotification(notification.id);
                          }}
                        >
                          <X />
                        </Button>
                      </div>
                      <p>{notification.message}</p>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div>
                  <Bell />
                  <p>No new notifications</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                <Avatar>
                  <AvatarImage
                    src={userMetadata.avatar_url}
                    alt={userMetadata.full_name || username || 'User'}
                  />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div>
                <p>{userMetadata.full_name || username || 'User'}</p>
                <p>{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/profile/${username ?? user.id}`}>
                  <UserIcon />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/posts">
                  <FileText />
                  My Posts
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      )}

      <ModeToggle />

      {/* Mobile menu */}
      <div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle>Menu</SheetTitle>

            {user ? (
              <div>
                {/* User info */}
                <div>
                  <Avatar>
                    <AvatarImage
                      src={userMetadata.avatar_url}
                      alt={userMetadata.full_name || username || 'User'}
                    />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{userMetadata.full_name || username || 'User'}</p>
                    <p>{user.email}</p>
                  </div>
                </div>

                {/* Navigation */}
                <div>
                  {primaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? 'secondary' : 'ghost'}
                        asChild
                      >
                        <Link href={item.href}>
                          <Icon />
                          {item.label}
                        </Link>
                      </Button>
                    );
                  })}
                </div>

                {/* Quick actions */}
                <div>
                  <Button variant="default" asChild>
                    <Link href="/posts/new">
                      <PenSquare />
                      Write
                    </Link>
                  </Button>
                </div>

                {/* User actions */}
                <div>
                  <Button variant="ghost" asChild>
                    <Link href={`/profile/${username ?? user.id}`}>
                      <UserIcon />
                      Profile
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard/settings">
                      <Settings />
                      Settings
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={handleSignOut}>
                    <LogOut />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button variant="ghost" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="default" asChild>
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
