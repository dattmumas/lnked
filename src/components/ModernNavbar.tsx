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
import {
  Menu,
  PenSquare,
  LayoutDashboard,
  FileText,
  User as UserIcon,
  Settings,
  LogOut,
  Compass,
  Search,
  MessageCircle,
  Video,
} from 'lucide-react';
import ModeToggle from '@/components/app/nav/ModeToggle';
import SearchBar from '@/components/app/nav/SearchBar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

const publicNavItems = [
  {
    href: '/discover',
    label: 'Discover',
    icon: Compass,
  },
];

const authenticatedNavItems = [
  {
    href: '/discover',
    label: 'Discover',
    icon: Compass,
  },
  {
    href: '/chat',
    label: 'Chat',
    icon: MessageCircle,
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  if (isAuthPage) {
    return (
      <div className="flex items-center gap-4 h-16 px-8">
        <Button
          variant="ghost"
          size="default"
          asChild
          className="gap-2 h-10 px-4 font-medium"
        >
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
    <nav className="w-full">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              href="/"
              className="text-2xl font-extrabold-serif tracking-tight flex items-center gap-0.5 select-none hover:opacity-80 transition-opacity"
              style={{ letterSpacing: '-0.04em' }}
            >
              Lnked<span className="text-red-500 text-3xl leading-none">.</span>
            </Link>

            {/* Nav Items - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              {(user ? authenticatedNavItems : publicNavItems).map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/70 hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Center: Search - Desktop */}
          {user && (
            <div className="hidden lg:block flex-1 max-w-xl mx-8">
              <SearchBar className="w-full h-9" />
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-20 rounded-lg bg-muted animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              </div>
            ) : user ? (
              <>
                {/* Write Button - Desktop */}
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="hidden sm:flex gap-2 h-9 px-3 font-medium"
                >
                  <Link href="/posts/new">
                    <PenSquare className="h-4 w-4" />
                    <span>Write</span>
                  </Link>
                </Button>

                {/* Search Button - Mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-9 w-9 p-0"
                  onClick={() => router.push('/search')}
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>

                {/* Notifications */}
                <NotificationDropdown userId={user.id} />

                {/* User Menu */}
                <DropdownMenu
                  open={isUserMenuOpen}
                  onOpenChange={setIsUserMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative rounded-full p-0 h-9 w-9"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={userMetadata.avatar_url}
                          alt={userMetadata.full_name || username || 'User'}
                        />
                        <AvatarFallback className="text-xs font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 shadow-lg">
                    <div className="flex flex-col gap-1 p-3 border-b">
                      <p className="font-medium">
                        {userMetadata.full_name || username || 'User'}
                      </p>
                      <span className="text-xs text-foreground/60">
                        {user.email}
                      </span>
                    </div>
                    <div className="p-1">
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href={`/profile/${username ?? user.id}`}
                          className="gap-3 p-2"
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/chat" className="gap-3 p-2">
                          <MessageCircle className="h-4 w-4" />
                          <span>Chat</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/dashboard/posts" className="gap-3 p-2">
                          <FileText className="h-4 w-4" />
                          <span>My Posts</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href="/dashboard/video-management"
                          className="gap-3 p-2"
                        >
                          <Video className="h-4 w-4" />
                          <span>Video Management</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/dashboard/settings" className="gap-3 p-2">
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-1">
                      <DropdownMenuItem
                        onSelect={handleSignOut}
                        className="gap-3 p-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-9 px-3 font-medium"
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="h-9 px-3 font-medium"
                >
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </>
            )}

            <div className="h-5 w-px bg-border mx-1" />
            <ModeToggle />

            {/* Mobile Menu - Only show when user is logged in */}
            {user && (
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetTitle className="text-xl font-semibold">
                      Menu
                    </SheetTitle>

                    <div className="flex flex-col gap-6 mt-8">
                      {/* User Info */}
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/30">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={userMetadata.avatar_url}
                            alt={userMetadata.full_name || username || 'User'}
                          />
                          <AvatarFallback className="text-sm font-medium">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {userMetadata.full_name || username || 'User'}
                          </p>
                          <p className="text-sm text-foreground/60 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider px-3">
                          Navigation
                        </p>
                        {authenticatedNavItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = isActiveRoute(item.href);
                          return (
                            <Button
                              key={item.href}
                              variant={isActive ? 'secondary' : 'ghost'}
                              className="w-full justify-start gap-3 h-11"
                              asChild
                            >
                              <Link href={item.href}>
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">
                                  {item.label}
                                </span>
                              </Link>
                            </Button>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider px-3">
                          Actions
                        </p>
                        <Button
                          variant="default"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href="/posts/new">
                            <PenSquare className="h-5 w-5" />
                            <span className="font-medium">Write New Post</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href="/chat">
                            <MessageCircle className="h-5 w-5" />
                            <span className="font-medium">Open Chat</span>
                          </Link>
                        </Button>
                      </div>

                      {/* Account */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider px-3">
                          Account
                        </p>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href={`/profile/${username ?? user.id}`}>
                            <UserIcon className="h-5 w-5" />
                            <span className="font-medium">Profile</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href="/dashboard/settings">
                            <Settings className="h-5 w-5" />
                            <span className="font-medium">Settings</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-5 w-5" />
                          <span className="font-medium">Sign Out</span>
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
