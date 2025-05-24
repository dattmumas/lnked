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
    <nav className="flex items-center gap-3">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-4">
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
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Link>
            </Button>
          );
        })}

        {/* Search bar */}
        <div className="hidden lg:block">
          <SearchBar className="w-64" />
        </div>
      </div>

      {/* User actions */}
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
        </div>
      ) : user ? (
        <div className="flex items-center gap-2">
          {/* Write button */}
          <Button
            variant="default"
            size="sm"
            asChild
            className="hidden sm:flex"
          >
            <Link href="/posts/new">
              <PenSquare className="w-4 h-4 mr-2" />
              Write
            </Link>
          </Button>

          {/* Search button for mobile/tablet */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => router.push('/search')}
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                {notifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs flex items-center justify-center"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {notifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={handleNotificationClick}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
              </div>

              {notifications > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {notificationList.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start p-3 space-y-1 relative group"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className={`w-2 h-2 ${notification.color} rounded-full`}
                        />
                        <span className="text-sm font-medium">
                          {notification.title}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {notification.time}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 p-1 h-auto w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissNotification(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No new notifications</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
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
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {userMetadata.full_name || username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/profile/${username ?? user.id}`}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/posts">
                  <FileText className="mr-2 h-4 w-4" />
                  My Posts
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleSignOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center gap-2">
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
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetTitle className="mb-6">Menu</SheetTitle>

            {user ? (
              <div className="space-y-6">
                {/* User info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={userMetadata.avatar_url}
                      alt={userMetadata.full_name || username || 'User'}
                    />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {userMetadata.full_name || username || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-2">
                  {primaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href={item.href}>
                          <Icon className="mr-3 h-4 w-4" />
                          {item.label}
                        </Link>
                      </Button>
                    );
                  })}
                </div>

                {/* Quick actions */}
                <div className="border-t pt-4 space-y-2">
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/posts/new">
                      <PenSquare className="mr-3 h-4 w-4" />
                      Write
                    </Link>
                  </Button>
                </div>

                {/* User actions */}
                <div className="border-t pt-4 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href={`/profile/${username ?? user.id}`}>
                      <UserIcon className="mr-3 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/dashboard/settings">
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="default" className="w-full" asChild>
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
