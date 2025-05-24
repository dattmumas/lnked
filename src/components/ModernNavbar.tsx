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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← Back to Home</Link>
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
    <nav className="flex items-center justify-between gap-4">
      {/* Left Section - Primary Navigation */}
      <div className="flex items-center gap-2">
        {/* Desktop Navigation Items */}
        <div className="hidden md:flex items-center gap-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);
            return (
              <Button
                key={item.href}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                asChild
                className="gap-2"
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Desktop Search */}
        <div className="hidden lg:block ml-4">
          <SearchBar className="w-64" />
        </div>
      </div>

      {/* Right Section - User Actions */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        ) : user ? (
          <>
            {/* Write Button - Desktop */}
            <Button
              variant="default"
              size="sm"
              asChild
              className="hidden sm:flex gap-2"
            >
              <Link href="/posts/new">
                <PenSquare className="h-4 w-4" />
                <span>Write</span>
              </Link>
            </Button>

            {/* Search Button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => router.push('/search')}
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {notifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {notifications}
                    </Badge>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {notifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-auto p-1"
                      onClick={handleNotificationClick}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>

                {notifications > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {notificationList.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="p-4 cursor-pointer focus:bg-accent"
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${notification.color}`}
                              />
                              <span className="font-medium text-sm">
                                {notification.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {notification.time}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismissNotification(notification.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No new notifications
                    </p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu
              open={isUserMenuOpen}
              onOpenChange={setIsUserMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={userMetadata.avatar_url}
                      alt={userMetadata.full_name || username || 'User'}
                    />
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col gap-1 p-2">
                  <p className="text-sm font-medium">
                    {userMetadata.full_name || username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/profile/${username ?? user.id}`}
                    className="gap-2"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/posts" className="gap-2">
                    <FileText className="h-4 w-4" />
                    My Posts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleSignOut}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </>
        )}

        <ModeToggle />

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle>Menu</SheetTitle>

              {user ? (
                <div className="flex flex-col gap-6 mt-6">
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={userMetadata.avatar_url}
                        alt={userMetadata.full_name || username || 'User'}
                      />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {userMetadata.full_name || username || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                      Navigation
                    </p>
                    {primaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isActiveRoute(item.href);
                      return (
                        <Button
                          key={item.href}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className="w-full justify-start gap-3"
                          asChild
                        >
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                      Actions
                    </p>
                    <Button
                      variant="default"
                      className="w-full justify-start gap-3"
                      asChild
                    >
                      <Link href="/posts/new">
                        <PenSquare className="h-4 w-4" />
                        Write New Post
                      </Link>
                    </Button>
                  </div>

                  {/* Account */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                      Account
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      asChild
                    >
                      <Link href={`/profile/${username ?? user.id}`}>
                        <UserIcon className="h-4 w-4" />
                        Profile
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      asChild
                    >
                      <Link href="/dashboard/settings">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-6">
                  <Button variant="default" className="w-full" asChild>
                    <Link href="/sign-up">Get Started</Link>
                  </Button>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
