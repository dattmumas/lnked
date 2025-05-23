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
} from 'lucide-react';
import ModeToggle from '@/components/app/nav/ModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '@/components/app/nav/SearchBar';

const primaryNavItems = [
  {
    href: '/discover',
    label: 'Discover',
    icon: Compass,
    description: 'Explore trending content',
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Your control center',
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
      <motion.nav
        className="flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← Back</Link>
        </Button>
        <ModeToggle />
      </motion.nav>
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
    <motion.nav
      className="flex items-center justify-between w-full"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Left side - Primary navigation */}
      <div className="flex items-center gap-6">
        {/* Primary nav items - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);
            return (
              <motion.div
                key={item.href}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                  className={`
                    nav-item modern-button px-4 py-2 font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'active bg-accent/80 text-accent-foreground shadow-sm'
                        : 'hover:bg-accent/50'
                    }
                  `}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="size-4 mr-2" />
                    {item.label}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Search bar - Desktop */}
        <div className="hidden lg:flex items-center">
          <SearchBar className="w-80" />
        </div>
      </div>

      {/* Right side - Actions and user menu */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-accent/30 rounded animate-pulse" />
            <div className="h-8 w-8 bg-accent/30 rounded-full animate-pulse" />
          </div>
        ) : user ? (
          <>
            {/* Quick actions - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.href}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={action.variant}
                      size="sm"
                      asChild
                      className="modern-button px-4 py-2 font-medium shadow-sm focus-visible-ring"
                    >
                      <Link href={action.href}>
                        <Icon className="size-4 mr-2" />
                        {action.label}
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="modern-button relative p-2 focus-visible-ring"
                    aria-label={`${notifications} notifications`}
                  >
                    <Bell className="h-4 w-4" />
                    <AnimatePresence>
                      {notifications > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1"
                        >
                          <Badge
                            variant="destructive"
                            className="notification-pulse h-5 w-5 p-0 text-xs flex items-center justify-center"
                          >
                            {notifications}
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border shadow-xl w-80 mt-2 bg-white dark:bg-slate-950 text-foreground animate-in fade-in-0 slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
                align="end"
              >
                <div className="px-3 py-2 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {notifications > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
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
                            className={`w-2 h-2 ${notification.color} rounded-full flex-shrink-0`}
                          ></div>
                          <span className="text-sm font-medium">
                            {notification.title}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {notification.time}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto w-auto ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground pr-6">
                          {notification.message}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}

                {notifications > 0 && (
                  <div className="border-t border-border/30 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                    >
                      View all notifications
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu
              open={isUserMenuOpen}
              onOpenChange={setIsUserMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full p-0"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={userMetadata.avatar_url}
                        alt={userMetadata.full_name || username || 'User'}
                      />
                      <AvatarFallback className="text-xs font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border shadow-xl w-56 mt-2 bg-white dark:bg-slate-950 text-foreground animate-in fade-in-0 slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
                align="end"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {userMetadata.full_name || username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  onSelect={() => setIsUserMenuOpen(false)}
                >
                  <Link href={`/profile/${username ?? user.id}`}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  onSelect={() => setIsUserMenuOpen(false)}
                >
                  <Link href="/dashboard/posts">
                    <FileText className="mr-2 h-4 w-4" />
                    My Posts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  onSelect={() => setIsUserMenuOpen(false)}
                >
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setIsUserMenuOpen(false);
                    handleSignOut();
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle className="flex items-center justify-center mb-6">
                <div className="relative">
                  {/* Top decorative line */}
                  <div className="absolute -top-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

                  {/* Main logo text */}
                  <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight relative">
                    <span className="relative">
                      Lnked
                      <span className="text-red-600 dark:text-red-500 text-3xl leading-none">
                        .
                      </span>
                    </span>
                  </h1>

                  {/* Bottom decorative line */}
                  <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
                </div>
              </SheetTitle>

              {user ? (
                <div className="space-y-6">
                  {/* User info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
                    <Avatar className="h-10 w-10">
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

                  {/* Primary navigation */}
                  <div className="space-y-1">
                    {primaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isActiveRoute(item.href);
                      return (
                        <Button
                          key={item.href}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className="w-full justify-start h-11"
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
                  <div className="border-t pt-4 space-y-1">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.href}
                          variant="default"
                          className="w-full justify-start h-11"
                          asChild
                        >
                          <Link href={action.href}>
                            <Icon className="mr-3 h-4 w-4" />
                            {action.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>

                  {/* User actions */}
                  <div className="border-t pt-4 space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11"
                      asChild
                    >
                      <Link href={`/profile/${username ?? user.id}`}>
                        <UserIcon className="mr-3 h-4 w-4" />
                        My Profile
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11"
                      asChild
                    >
                      <Link href="/dashboard/settings">
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11 text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button variant="ghost" className="w-full h-11" asChild>
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
      </div>
    </motion.nav>
  );
}
